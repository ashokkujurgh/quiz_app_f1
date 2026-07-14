import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as quizzesApi from '../../api/services/quizzes';
import { dedupeById } from '../../utils/dedupe';
import type { Quiz, QuizHistoryEntry, LeaderboardEntry } from '../../types';

type GameState = 'idle' | 'lobby' | 'playing' | 'ended';

interface LiveQuestion {
  questionIndex: number;
  questionId: string;
  question: string;
  options: string[];
  timeLimit: number;
  total: number;
}

interface QuizState {
  // Mirrors the web app's three Quizzes-tab data sources.
  activeAndUpcoming: Quiz[];
  pastQuizzes: Quiz[];
  invited: Quiz[];
  loadingActive: boolean;
  loadingPast: boolean;
  loadingInvited: boolean;
  myHistory: QuizHistoryEntry[];
  activeQuizId: string | null;
  gameState: GameState;
  currentQuestion: LiveQuestion | null;
  timeLeft: number;
  selectedAnswer: number | null;
  correctOption: number | null;
  leaderboard: LeaderboardEntry[];
  gameError: string | null;
}

const initialState: QuizState = {
  activeAndUpcoming: [],
  pastQuizzes: [],
  invited: [],
  loadingActive: false,
  loadingPast: false,
  loadingInvited: false,
  myHistory: [],
  activeQuizId: null,
  gameState: 'idle',
  currentQuestion: null,
  timeLeft: 0,
  selectedAnswer: null,
  correctOption: null,
  leaderboard: [],
  gameError: null,
};

/** "Active & Upcoming" tab = status=active + status=scheduled merged, like QuizzesPage.tsx. */
export const fetchActiveAndUpcoming = createAsyncThunk('quiz/fetchActiveAndUpcoming', async () => {
  const [activeRes, scheduledRes] = await Promise.all([
    quizzesApi.fetchQuizzes({ status: 'active' }),
    quizzesApi.fetchQuizzes({ status: 'scheduled' }),
  ]);
  return [...activeRes.quizzes, ...scheduledRes.quizzes];
});

export const fetchPastQuizzes = createAsyncThunk('quiz/fetchPastQuizzes', async () => {
  const res = await quizzesApi.fetchQuizzes({ status: 'completed' });
  return res.quizzes;
});

export const fetchMyInvited = createAsyncThunk('quiz/fetchMyInvited', async () => {
  const res = await quizzesApi.fetchMyInvited();
  return res.quizzes;
});

export const fetchMyHistory = createAsyncThunk('quiz/fetchMyHistory', async () => {
  const res = await quizzesApi.fetchMyHistory();
  return res.history;
});

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    joinGame(state, action: PayloadAction<string>) {
      state.activeQuizId = action.payload;
      state.gameState = 'lobby';
      state.currentQuestion = null;
      state.leaderboard = [];
      state.gameError = null;
    },
    gameStarted(state) {
      state.gameState = 'playing';
    },
    questionReceived(state, action: PayloadAction<LiveQuestion>) {
      state.currentQuestion = action.payload;
      state.timeLeft = action.payload.timeLimit;
      state.selectedAnswer = null;
      state.correctOption = null;
    },
    tickTimer(state) {
      if (state.timeLeft > 0) state.timeLeft -= 1;
    },
    answerSelected(state, action: PayloadAction<number>) {
      state.selectedAnswer = action.payload;
    },
    questionEnded(state, action: PayloadAction<{ correctOption: number }>) {
      state.correctOption = action.payload.correctOption;
    },
    leaderboardUpdated(state, action: PayloadAction<LeaderboardEntry[]>) {
      state.leaderboard = action.payload;
    },
    gameOver(state, action: PayloadAction<LeaderboardEntry[]>) {
      state.gameState = 'ended';
      state.leaderboard = action.payload;
    },
    gameErrored(state, action: PayloadAction<string>) {
      state.gameError = action.payload;
    },
    resetGame(state) {
      state.activeQuizId = null;
      state.gameState = 'idle';
      state.currentQuestion = null;
      state.selectedAnswer = null;
      state.correctOption = null;
      state.leaderboard = [];
      state.gameError = null;
    },
    quizActivated(state, action: PayloadAction<string>) {
      const q = state.activeAndUpcoming.find((x) => x._id === action.payload);
      if (q) q.status = 'active';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveAndUpcoming.pending, (state) => {
        state.loadingActive = true;
      })
      .addCase(fetchActiveAndUpcoming.fulfilled, (state, action) => {
        state.loadingActive = false;
        state.activeAndUpcoming = dedupeById(action.payload, (q) => q?._id);
      })
      .addCase(fetchActiveAndUpcoming.rejected, (state) => {
        state.loadingActive = false;
      })
      .addCase(fetchPastQuizzes.pending, (state) => {
        state.loadingPast = true;
      })
      .addCase(fetchPastQuizzes.fulfilled, (state, action) => {
        state.loadingPast = false;
        state.pastQuizzes = dedupeById(action.payload, (q) => q?._id);
      })
      .addCase(fetchPastQuizzes.rejected, (state) => {
        state.loadingPast = false;
      })
      .addCase(fetchMyInvited.pending, (state) => {
        state.loadingInvited = true;
      })
      .addCase(fetchMyInvited.fulfilled, (state, action) => {
        state.loadingInvited = false;
        state.invited = dedupeById(action.payload, (q) => q?._id);
      })
      .addCase(fetchMyInvited.rejected, (state) => {
        state.loadingInvited = false;
      })
      .addCase(fetchMyHistory.fulfilled, (state, action) => {
        state.myHistory = action.payload;
      });
  },
});

export const {
  joinGame,
  gameStarted,
  questionReceived,
  tickTimer,
  answerSelected,
  questionEnded,
  leaderboardUpdated,
  gameOver,
  gameErrored,
  resetGame,
  quizActivated,
} = quizSlice.actions;
export default quizSlice.reducer;
