import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import Quiz from '../models/Quiz';
import GameAnswer from '../models/GameAnswer';
import LeaderboardEntry from '../models/LeaderboardEntry';
import GameHistory from '../models/GameHistory';
import { Types } from 'mongoose';
import { createQuizEndedPost } from '../services/quizPostService';

const QUESTION_URL = process.env.QUESTION_SERVICE_URL ?? 'http://localhost:4003';
const JWT_SECRET   = process.env.JWT_SECRET!;

interface JwtPayload { id: string; email: string; role: string }
interface ApiQuestion { _id: string; text: string; options: { text: string }[]; correctOption: number }

interface PlayerInfo {
  userId:    string;
  userName:  string;
  userAvatar?: string;
  socketId:  string;
}

interface GameState {
  mode:                 'per_question' | 'total_timer';
  totalQuestions:       number;
  // per_question fields
  timeLimitPerQuestion: number;
  currentIndex:         number;
  currentQuestion:      ApiQuestion | null;
  questionStartedAt:    number;
  questionEnded:        boolean;
  // total_timer fields
  durationSeconds:      number;
  gameStartedAt:        number;
  allQuestions:         ApiQuestion[];
  players:              Map<string, PlayerInfo>; // userId → info
  // in-memory answer cache: userId → { questionIndex → { questionId, answer } }
  answerCache:          Map<string, Map<number, { questionId: string; answer: number }>>;
}

let io: IOServer;

const activeGames  = new Set<string>();
const gameStateMap = new Map<string, GameState>();
// socketId → { userId, quizId } for cleanup on disconnect
const socketMeta   = new Map<string, { userId: string; quizId: string }>();
// quizId → players waiting/playing (exists even before game starts)
const quizPlayers  = new Map<string, Map<string, PlayerInfo>>();
// quizId → set of userIds who joined and then disconnected mid-game (not allowed back in)
const exitedPlayers = new Map<string, Set<string>>();

export function initGameSocket(httpServer: HttpServer): IOServer {
  io = new IOServer(httpServer, {
    path: '/quiz.io/',
    cors: {
      origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5174')
        .split(',').map((o) => o.trim()),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) { next(new Error('No token')); return; }
    try {
      const payload = jwt.verify(token, JWT_SECRET, { issuer: 'meenzo-auth' }) as JwtPayload;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    console.log(`[GameSocket] connected: ${user.id} (${user.email})`);

    socket.on('join_game', async ({
      quizId, userName, userAvatar,
    }: { quizId: string; userName: string; userAvatar?: string }) => {
      if (!quizId) return;

      // Block re-entry: if user exited an active game, they cannot rejoin
      if (exitedPlayers.get(quizId)?.has(user.id)) {
        socket.emit('already_attempted', {
          quizId,
          message: 'You have already attempted this quiz. You cannot re-enter once you have left.',
        });
        console.log(`[GameSocket] ${user.id} blocked re-entry into quiz:${quizId}`);
        return;
      }

      await socket.join(`quiz:${quizId}`);
      socketMeta.set(socket.id, { userId: user.id, quizId });

      const player: PlayerInfo = {
        userId:    user.id,
        userName:  userName || user.email,
        userAvatar,
        socketId:  socket.id,
      };

      // Always track in quizPlayers (pre-game + in-game roster)
      if (!quizPlayers.has(quizId)) quizPlayers.set(quizId, new Map());
      quizPlayers.get(quizId)!.set(user.id, player);

      // Also sync into active game state if running
      const state = gameStateMap.get(quizId);
      if (state) state.players.set(user.id, player);

      // Broadcast to everyone already in the room
      socket.to(`quiz:${quizId}`).emit('player_joined', {
        userId:    player.userId,
        userName:  player.userName,
        userAvatar: player.userAvatar,
      });

      // Send full roster to the joining socket
      const roster = [...(quizPlayers.get(quizId)?.values() ?? [])].map((p) => ({
        userId: p.userId, userName: p.userName, userAvatar: p.userAvatar,
      }));
      socket.emit('players_list', { players: roster });

      console.log(`[GameSocket] ${user.id} joined quiz:${quizId}`);

      // If no live session but quiz is active in DB, restart the game session
      if (!state) {
        try {
          const dbQuiz = await Quiz.findById(quizId).select('status').lean();
          if (dbQuiz?.status === 'active' && !activeGames.has(quizId)) {
            console.log(`[GameSocket] Restarting orphaned game session for ${quizId}`);
            startGameSession(quizId).catch(console.error);
          }
        } catch { /* ignore */ }
      }

      // Replay current game state if game already running
      if (state) {
        if (state.mode === 'total_timer') {
          const elapsed   = Math.floor((Date.now() - state.gameStartedAt) / 1000);
          const remaining = Math.max(0, state.durationSeconds - elapsed);
          socket.emit('game_started', {
            quizId,
            mode:             'total_timer',
            durationSeconds:  state.durationSeconds,
            remainingSeconds: remaining,
            questions:        state.allQuestions.map((q) => ({
              questionId: q._id,
              question:   q.text,
              options:    q.options.map((o) => o.text),
            })),
          });
        } else if (state.currentQuestion) {
          socket.emit('game_started', {
            quizId,
            mode:                 'per_question',
            totalQuestions:       state.totalQuestions,
            timeLimitPerQuestion: state.timeLimitPerQuestion,
          });

          const elapsed   = Math.floor((Date.now() - state.questionStartedAt) / 1000);
          const remaining = Math.max(1, state.timeLimitPerQuestion - elapsed);
          const q         = state.currentQuestion;

          socket.emit('question', {
            quizId,
            questionIndex: state.currentIndex,
            questionId:    q._id,
            question:      q.text,
            options:       q.options.map((o) => o.text),
            timeLimit:     remaining,
            total:         state.totalQuestions,
          });

          if (state.questionEnded) {
            socket.emit('question_ended', {
              quizId,
              questionIndex: state.currentIndex,
              correctAnswer: q.correctOption,
              correctOption: q.options[q.correctOption]?.text ?? '',
            });
          }
        }
      }
    });

    socket.on('submit_answer', async ({
      quizId, questionId, questionIndex, answer,
    }: { quizId: string; questionId: string; questionIndex: number; answer: number }) => {
      // Cache in-memory first (survives DB hiccups)
      const gs = gameStateMap.get(quizId);
      if (gs) {
        if (!gs.answerCache.has(user.id)) gs.answerCache.set(user.id, new Map());
        gs.answerCache.get(user.id)!.set(questionIndex, { questionId, answer });
      }
      try {
        await GameAnswer.findOneAndUpdate(
          { quizId: new Types.ObjectId(quizId), userId: user.id, questionIndex },
          { questionId, answer, answeredAt: new Date() },
          { upsert: true, new: true },
        );
      } catch (err) {
        console.error('[GameSocket] submit_answer error:', err);
      }
    });

    socket.on('disconnect', () => {
      const meta = socketMeta.get(socket.id);
      if (meta) {
        const { userId, quizId } = meta;
        quizPlayers.get(quizId)?.delete(userId);
        gameStateMap.get(quizId)?.players.delete(userId);
        io.to(`quiz:${quizId}`).emit('player_left', { userId });
        socketMeta.delete(socket.id);

        // If the game is still active, mark this user as exited so they can't rejoin
        if (activeGames.has(quizId)) {
          if (!exitedPlayers.has(quizId)) exitedPlayers.set(quizId, new Set());
          exitedPlayers.get(quizId)!.add(userId);
          console.log(`[GameSocket] ${userId} exited active quiz:${quizId} — re-entry blocked`);
        }
      }
      console.log(`[GameSocket] disconnected: ${user.id}`);
    });
  });

  return io;
}

export function getIO(): IOServer { return io; }

// ── Game loop ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildLeaderboard(
  quizId: string,
  quizTitle: string,
  questions: ApiQuestion[],
  gameStartedAt: number,
  playersMap: Map<string, PlayerInfo>,
  answerCache: Map<string, Map<number, { questionId: string; answer: number }>> = new Map(),
): Promise<{ rank: number; userId: string; userName: string; userAvatar?: string; score: number; total: number; percentage: number; timeTaken: number }[]> {
  // Mark all submitted answers as correct/incorrect
  try {
    for (const q of questions) {
      await GameAnswer.updateMany(
        { quizId: new Types.ObjectId(quizId), questionId: q._id },
        [{ $set: { isCorrect: { $eq: ['$answer', q.correctOption] } } }],
      );
    }
  } catch (err) {
    console.error('[buildLeaderboard] updateMany error (non-fatal):', err);
  }

  // Read DB answers and merge with in-memory cache (cache wins for missing entries)
  let dbAnswers: { userId: string; questionIndex: number; questionId: string; answer: number; isCorrect: boolean; answeredAt: Date }[] = [];
  try {
    dbAnswers = await GameAnswer.find({ quizId: new Types.ObjectId(quizId) }).lean() as typeof dbAnswers;
  } catch (err) {
    console.error('[buildLeaderboard] find error (will use cache only):', err);
  }

  // Build per-user answer map: userId → { questionIndex → answer }
  const userAnswerMap = new Map<string, Map<number, { questionId: string; answer: number; isCorrect: boolean; answeredAt: Date }>>();
  for (const a of dbAnswers) {
    if (!userAnswerMap.has(a.userId)) userAnswerMap.set(a.userId, new Map());
    userAnswerMap.get(a.userId)!.set(a.questionIndex, a);
  }
  // Merge in-memory cache for any entries missing from DB
  for (const [uid, qMap] of answerCache) {
    if (!userAnswerMap.has(uid)) userAnswerMap.set(uid, new Map());
    for (const [qi, cached] of qMap) {
      if (!userAnswerMap.get(uid)!.has(qi)) {
        const q = questions[qi];
        userAnswerMap.get(uid)!.set(qi, {
          ...cached,
          isCorrect:   q ? cached.answer === q.correctOption : false,
          answeredAt:  new Date(),
        });
      }
    }
  }

  const byUser = new Map<string, { score: number; name: string; avatar?: string; lastAnsweredAt: Date }>();

  for (const [uid, p] of playersMap) {
    byUser.set(uid, { score: 0, name: p.userName, avatar: p.userAvatar, lastAnsweredAt: new Date(0) });
  }
  // Tally scores from merged answer map
  for (const [uid, qMap] of userAnswerMap) {
    const entry = byUser.get(uid) ?? { score: 0, name: playersMap.get(uid)?.userName ?? uid, avatar: playersMap.get(uid)?.userAvatar, lastAnsweredAt: new Date(0) };
    for (const a of qMap.values()) {
      if (a.isCorrect) entry.score += 1;
      if (a.answeredAt > entry.lastAnsweredAt) entry.lastAnsweredAt = a.answeredAt;
    }
    byUser.set(uid, entry);
  }

  const total            = questions.length;
  const timeTakenOverall = Math.round((Date.now() - gameStartedAt) / 1000);
  const completedAt      = new Date();

  const ranked = [...byUser.entries()]
    .sort((a, b) =>
      b[1].score !== a[1].score
        ? b[1].score - a[1].score
        : a[1].lastAnsweredAt.getTime() - b[1].lastAnsweredAt.getTime()
    )
    .map(([userId, d], idx) => ({
      rank:       idx + 1,
      userId,
      userName:   d.name,
      userAvatar: d.avatar,
      score:      d.score,
      total,
      percentage: Math.round((d.score / total) * 100),
      timeTaken:  timeTakenOverall,
    }));

  // Save GameHistory per player
  await GameHistory.deleteMany({ quizId: new Types.ObjectId(quizId) });
  await GameHistory.insertMany(
    ranked.map((r) => {
      const playerAnswers = userAnswerMap.get(r.userId) ?? new Map();
      return {
        quizId:      new Types.ObjectId(quizId),
        quizTitle,
        userId:      r.userId,
        userName:    r.userName,
        userAvatar:  r.userAvatar,
        score:       r.score,
        total,
        percentage:  r.percentage,
        rank:        r.rank,
        timeTaken:   r.timeTaken,
        completedAt,
        answers: questions.map((q, i) => {
          const ans = playerAnswers.get(i);
          return {
            questionIndex: i,
            questionId:    q._id,
            questionText:  q.text,
            options:       q.options.map((o) => o.text),
            correctOption: q.correctOption,
            userAnswer:    ans?.answer ?? -1,
            isCorrect:     ans?.isCorrect ?? false,
          };
        }),
      };
    })
  );

  return ranked;
}

export async function startGameSession(quizId: string): Promise<void> {
  if (activeGames.has(quizId)) {
    console.log(`[GameSession] ${quizId} already running`);
    return;
  }
  activeGames.add(quizId);

  try {
    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) { activeGames.delete(quizId); return; }

    const ids = quiz.questions.map((id) => id.toString()).join(',');
    const { data } = await axios.get(`${QUESTION_URL}/api/questions`, { params: { ids } });
    const questions: ApiQuestion[] = data.questions ?? [];

    if (questions.length === 0) { activeGames.delete(quizId); return; }

    const room          = `quiz:${quizId}`;
    const mode          = quiz.timeLimitPerQuestion ? 'per_question' : 'total_timer';
    const preGamePlayers = quizPlayers.get(quizId) ?? new Map<string, PlayerInfo>();

    await GameAnswer.deleteMany({ quizId: new Types.ObjectId(quizId) });

    // Notify everyone on the quiz list that this quiz is live
    io.emit('quiz_activated', { quizId, title: quiz.title });

    if (mode === 'total_timer') {
      // ── Total quiz timer mode ─────────────────────────────────────────────
      const durationSeconds = (quiz.durationMinutes ?? 30) * 60;
      const gameStartedAt   = Date.now();

      gameStateMap.set(quizId, {
        mode,
        totalQuestions:       questions.length,
        timeLimitPerQuestion: 0,
        currentIndex:         0,
        currentQuestion:      null,
        questionStartedAt:    gameStartedAt,
        questionEnded:        false,
        durationSeconds,
        gameStartedAt,
        allQuestions:         questions,
        players:              new Map(preGamePlayers),
        answerCache:          new Map(),
      });

      io.to(room).emit('game_started', {
        quizId,
        mode:             'total_timer',
        durationSeconds,
        remainingSeconds: durationSeconds,
        questions:        questions.map((q) => ({
          questionId: q._id,
          question:   q.text,
          options:    q.options.map((o) => o.text),
        })),
      });

      // Wait for the full duration, then compute results
      await sleep(durationSeconds * 1000);

      const finalState   = gameStateMap.get(quizId);
      const playersMap   = finalState?.players ?? preGamePlayers;
      const leaderboard  = await buildLeaderboard(quizId, quiz.title, questions, gameStartedAt, playersMap, finalState?.answerCache);

      await LeaderboardEntry.deleteMany({ quizId: new Types.ObjectId(quizId) });
      await LeaderboardEntry.insertMany(
        leaderboard.map((e) => ({ ...e, quizId: new Types.ObjectId(quizId), completedAt: new Date() }))
      );
      await Quiz.findByIdAndUpdate(quizId, { status: 'completed', endedAt: new Date() });

      io.to(room).emit('game_over', { quizId, leaderboard });

      // Auto-create a feed post for public quizzes
      createQuizEndedPost({
        quizId,
        quizTitle:       quiz.title,
        topic:           quiz.topic?.toString() ?? 'General',
        subTopic:        quiz.subTopic?.toString() ?? null,
        participation:   quiz.participation,
        leaderboard,
        totalQuestions:  questions.length,
        durationMinutes: Math.round(durationSeconds / 60),
        adminUserId:     quiz.createdBy.toString(),
        adminName:       'QuizHub Admin',
        adminUsername:   'quizhub_admin',
        adminAvatar:     null,
      }).catch(console.error);

    } else {
      // ── Per-question timer mode ───────────────────────────────────────────
      const timePerQ      = quiz.timeLimitPerQuestion!;
      const gameStartedAt = Date.now();

      gameStateMap.set(quizId, {
        mode,
        totalQuestions:       questions.length,
        timeLimitPerQuestion: timePerQ,
        currentIndex:         0,
        currentQuestion:      null,
        questionStartedAt:    gameStartedAt,
        questionEnded:        false,
        durationSeconds:      0,
        gameStartedAt,
        allQuestions:         questions,
        players:              new Map(preGamePlayers),
        answerCache:          new Map(),
      });

      io.to(room).emit('game_started', {
        quizId,
        mode:                 'per_question',
        totalQuestions:       questions.length,
        timeLimitPerQuestion: timePerQ,
      });

      await sleep(1500);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const s = gameStateMap.get(quizId);
        if (s) {
          s.currentIndex      = i;
          s.currentQuestion   = q;
          s.questionStartedAt = Date.now();
          s.questionEnded     = false;
        }

        io.to(room).emit('question', {
          quizId,
          questionIndex: i,
          questionId:    q._id,
          question:      q.text,
          options:       q.options.map((o) => o.text),
          timeLimit:     timePerQ,
          total:         questions.length,
        });

        await sleep(timePerQ * 1000);

        const s2 = gameStateMap.get(quizId);
        if (s2) { s2.questionEnded = true; }

        await GameAnswer.updateMany(
          { quizId: new Types.ObjectId(quizId), questionIndex: i },
          [{ $set: { isCorrect: { $eq: ['$answer', q.correctOption] } } }],
        );

        io.to(room).emit('question_ended', {
          quizId,
          questionIndex: i,
          correctAnswer: q.correctOption,
          correctOption: q.options[q.correctOption]?.text ?? '',
        });

        // Emit live scores so all clients update the players panel immediately
        const liveState = gameStateMap.get(quizId);
        if (liveState) {
          const liveScores = [...liveState.players.values()].map((p) => {
            const cache = liveState.answerCache.get(p.userId) ?? new Map();
            let score = 0;
            cache.forEach(({ questionId: _, answer }, qIdx) => {
              if (qIdx <= i && answer === questions[qIdx]?.correctOption) score++;
            });
            return { userId: p.userId, userName: p.userName, userAvatar: p.userAvatar, score, answered: cache.size };
          }).sort((a, b) => b.score - a.score);
          io.to(room).emit('leaderboard_update', { quizId, scores: liveScores });
        }

        if (i < questions.length - 1) await sleep(3000);
      }

      const finalState  = gameStateMap.get(quizId);
      const playersMap  = finalState?.players ?? preGamePlayers;
      const leaderboard = await buildLeaderboard(quizId, quiz.title, questions, gameStartedAt, playersMap, finalState?.answerCache);

      await LeaderboardEntry.deleteMany({ quizId: new Types.ObjectId(quizId) });
      await LeaderboardEntry.insertMany(
        leaderboard.map((e) => ({ ...e, quizId: new Types.ObjectId(quizId), completedAt: new Date() }))
      );
      await Quiz.findByIdAndUpdate(quizId, { status: 'completed', endedAt: new Date() });

      io.to(room).emit('game_over', { quizId, leaderboard });

      // Auto-create a feed post for public quizzes
      createQuizEndedPost({
        quizId,
        quizTitle:       quiz.title,
        topic:           quiz.topic?.toString() ?? 'General',
        subTopic:        quiz.subTopic?.toString() ?? null,
        participation:   quiz.participation,
        leaderboard,
        totalQuestions:  questions.length,
        durationMinutes: quiz.durationMinutes,
        adminUserId:     quiz.createdBy.toString(),
        adminName:       'QuizHub Admin',
        adminUsername:   'quizhub_admin',
        adminAvatar:     null,
      }).catch(console.error);
    }

  } catch (err) {
    console.error('[GameSession] error:', err);
    io.to(`quiz:${quizId}`).emit('game_error', { message: 'Game session error. Please try again.' });
  } finally {
    activeGames.delete(quizId);
    gameStateMap.delete(quizId);
    quizPlayers.delete(quizId);
    exitedPlayers.delete(quizId); // quiz over — reset for next run
  }
}
