import 'dart:async';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/sockets/quiz_socket_service.dart';
import '../../../models/leaderboard_entry.dart';
import '../../auth/state/auth_controller.dart';
import 'quiz_play_state.dart';

part 'quiz_play_controller.g.dart';

@riverpod
class QuizPlayController extends _$QuizPlayController {
  QuizSocketService? _socket;
  Timer? _timer;

  @override
  QuizPlayState build(String quizId) {
    ref.onDispose(_disposeSession);
    _connect();
    return const QuizPlayState.connecting();
  }

  Future<void> _connect() async {
    final token = await ref.read(tokenStorageProvider).readAccessToken();
    final user = ref.read(authControllerProvider).valueOrNull;
    if (token == null || user == null) {
      state = const QuizPlayState.error('Not authenticated.');
      return;
    }

    final socket = QuizSocketService();
    _socket = socket;
    socket.connect(
      accessToken: token,
      onPlayerJoined: _onPlayerJoined,
      onPlayersList: _onPlayersList,
      onGameStarted: _onGameStarted,
      onQuestion: _onQuestion,
      onQuestionEnded: _onQuestionEnded,
      onLeaderboardUpdate: _onLeaderboardUpdate,
      onGameEnded: _onGameEnded,
      onAlreadyAttempted: _onAlreadyAttempted,
      onPlayerLeft: _onPlayerLeft,
      onGameError: _onGameError,
      onDisconnect: () {},
    );
    socket.joinGame(quizId: quizId, userName: user.name, userAvatar: user.avatar);
    state = const QuizPlayState.lobby();
  }

  void selectAnswer(int optionIndex) {
    final current = state;
    if (current is QuizPlayPerQuestionRound) {
      state = current.copyWith(selectedOption: optionIndex);
      _socket?.submitAnswer(
        quizId: quizId,
        questionId: current.question.questionId,
        questionIndex: current.question.questionIndex,
        answer: optionIndex,
      );
    } else if (current is QuizPlayTotalTimerRound) {
      final question = current.questions[current.currentIndex];
      state = current.copyWith(answers: {...current.answers, current.currentIndex: optionIndex});
      _socket?.submitAnswer(
        quizId: quizId,
        questionId: question.questionId,
        questionIndex: question.questionIndex,
        answer: optionIndex,
      );
    }
  }

  void nextQuestion() {
    final current = state;
    if (current is QuizPlayTotalTimerRound && current.currentIndex < current.questions.length - 1) {
      state = current.copyWith(currentIndex: current.currentIndex + 1);
    }
  }

  void prevQuestion() {
    final current = state;
    if (current is QuizPlayTotalTimerRound && current.currentIndex > 0) {
      state = current.copyWith(currentIndex: current.currentIndex - 1);
    }
  }

  // ── socket event handlers ──────────────────────────────────────────────

  void _onPlayersList(Map<String, dynamic> data) {
    final players = _parsePlayers(data['players']);
    state = switch (state) {
      QuizPlayLobby s => s.copyWith(players: players),
      QuizPlayPerQuestionRound s => s.copyWith(players: players),
      QuizPlayPerQuestionEnded s => s.copyWith(players: players),
      final s => s,
    };
  }

  void _onPlayerJoined(Map<String, dynamic> data) {
    final player = QuizPlayer(
      userId: data['userId']?.toString() ?? '',
      userName: data['userName']?.toString() ?? '',
      userAvatar: data['userAvatar']?.toString(),
    );
    state = switch (state) {
      QuizPlayLobby s => s.copyWith(players: [...s.players, player]),
      QuizPlayPerQuestionRound s => s.copyWith(players: [...s.players, player]),
      QuizPlayPerQuestionEnded s => s.copyWith(players: [...s.players, player]),
      final s => s,
    };
  }

  void _onPlayerLeft(Map<String, dynamic> data) {
    final userId = data['userId']?.toString();
    if (userId == null) return;
    state = switch (state) {
      QuizPlayLobby s => s.copyWith(players: s.players.where((p) => p.userId != userId).toList()),
      QuizPlayPerQuestionRound s => s.copyWith(players: s.players.where((p) => p.userId != userId).toList()),
      QuizPlayPerQuestionEnded s => s.copyWith(players: s.players.where((p) => p.userId != userId).toList()),
      final s => s,
    };
  }

  void _onGameStarted(Map<String, dynamic> data) {
    final mode = data['mode']?.toString();
    if (mode == 'total_timer') {
      final questionsJson = (data['questions'] as List?) ?? [];
      final questions = <LiveQuestion>[
        for (var i = 0; i < questionsJson.length; i++) _parseTotalTimerQuestion(questionsJson[i], i, questionsJson.length),
      ];
      final duration =
          (data['durationSeconds'] as num?)?.toInt() ?? (data['remainingSeconds'] as num?)?.toInt() ?? 0;
      state = QuizPlayState.totalTimerRound(
        questions: questions,
        currentIndex: 0,
        answers: const {},
        timeLeft: duration,
      );
      _startTicker(_tickTotalTimer);
    } else {
      // per_question mode — server will follow up with a `question` event.
      state = const QuizPlayState.lobby();
    }
  }

  LiveQuestion _parseTotalTimerQuestion(dynamic raw, int index, int total) {
    final q = Map<String, dynamic>.from(raw as Map);
    return LiveQuestion(
      questionIndex: index,
      questionId: q['_id']?.toString() ?? q['id']?.toString() ?? '',
      question: q['text']?.toString() ?? q['question']?.toString() ?? '',
      options: ((q['options'] as List?) ?? [])
          .map((o) => o is Map ? (o['text']?.toString() ?? '') : o.toString())
          .toList(),
      timeLimit: 0,
      total: total,
    );
  }

  void _onQuestion(Map<String, dynamic> data) {
    _timer?.cancel();
    final players = _currentPlayers();
    final question = LiveQuestion(
      questionIndex: (data['questionIndex'] as num?)?.toInt() ?? 0,
      questionId: data['questionId']?.toString() ?? '',
      question: data['question']?.toString() ?? '',
      options: ((data['options'] as List?) ?? []).map((o) => o.toString()).toList(),
      timeLimit: (data['timeLimit'] as num?)?.toInt() ?? 0,
      total: (data['total'] as num?)?.toInt() ?? 0,
    );
    state = QuizPlayState.perQuestionRound(question: question, timeLeft: question.timeLimit, players: players);
    _startTicker(_tickPerQuestion);
  }

  void _onQuestionEnded(Map<String, dynamic> data) {
    _timer?.cancel();
    final current = state;
    if (current is! QuizPlayPerQuestionRound) return;
    final correctOption =
        (data['correctOption'] as num?)?.toInt() ?? (data['correctAnswer'] as num?)?.toInt() ?? -1;
    state = QuizPlayState.perQuestionEnded(
      question: current.question,
      correctOption: correctOption,
      selectedOption: current.selectedOption,
      players: current.players,
      liveScores: current.liveScores,
    );
  }

  void _onLeaderboardUpdate(Map<String, dynamic> data) {
    final rawScores = (data['scores'] as List?) ?? [];
    final scores = <LeaderboardEntry>[
      for (var i = 0; i < rawScores.length; i++) _parseLiveScore(rawScores[i], i),
    ];
    state = switch (state) {
      QuizPlayPerQuestionRound s => s.copyWith(liveScores: scores),
      QuizPlayPerQuestionEnded s => s.copyWith(liveScores: scores),
      final s => s,
    };
  }

  LeaderboardEntry _parseLiveScore(dynamic raw, int index) {
    final s = Map<String, dynamic>.from(raw as Map);
    return LeaderboardEntry(
      rank: index + 1,
      userId: s['userId']?.toString() ?? '',
      userName: s['userName']?.toString() ?? '',
      userAvatar: s['userAvatar']?.toString(),
      score: (s['score'] as num?)?.toInt() ?? 0,
    );
  }

  void _onGameEnded(Map<String, dynamic> data) {
    _timer?.cancel();
    final leaderboard = ((data['leaderboard'] as List?) ?? [])
        .map((e) => LeaderboardEntry.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
    state = QuizPlayState.ended(leaderboard: leaderboard, quizTitle: data['quizTitle']?.toString());
  }

  void _onAlreadyAttempted(Map<String, dynamic> data) {
    _timer?.cancel();
    state = QuizPlayState.alreadyAttempted(message: data['message']?.toString());
  }

  void _onGameError(Map<String, dynamic> data) {
    state = QuizPlayState.error(data['message']?.toString() ?? 'Something went wrong.');
  }

  // ── timers ──────────────────────────────────────────────────────────────

  void _startTicker(void Function() onTick) {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => onTick());
  }

  void _tickPerQuestion() {
    final current = state;
    if (current is! QuizPlayPerQuestionRound) {
      _timer?.cancel();
      return;
    }
    if (current.timeLeft <= 0) {
      _timer?.cancel();
      return;
    }
    state = current.copyWith(timeLeft: current.timeLeft - 1);
  }

  void _tickTotalTimer() {
    final current = state;
    if (current is! QuizPlayTotalTimerRound) {
      _timer?.cancel();
      return;
    }
    if (current.timeLeft <= 0) {
      _timer?.cancel();
      return;
    }
    state = current.copyWith(timeLeft: current.timeLeft - 1);
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  List<QuizPlayer> _currentPlayers() {
    return switch (state) {
      QuizPlayLobby s => s.players,
      QuizPlayPerQuestionRound s => s.players,
      QuizPlayPerQuestionEnded s => s.players,
      _ => const [],
    };
  }

  List<QuizPlayer> _parsePlayers(dynamic raw) {
    return ((raw as List?) ?? []).map((p) {
      final m = Map<String, dynamic>.from(p as Map);
      return QuizPlayer(
        userId: m['userId']?.toString() ?? '',
        userName: m['userName']?.toString() ?? '',
        userAvatar: m['userAvatar']?.toString(),
      );
    }).toList();
  }

  void _disposeSession() {
    _timer?.cancel();
    _socket?.disconnect();
  }
}
