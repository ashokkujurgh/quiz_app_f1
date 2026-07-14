import 'package:socket_io_client/socket_io_client.dart' as io;

import 'socket_base.dart';

/// One instance per quiz-play session — created and disposed by
/// QuizPlayController, not a global keepAlive provider (unlike
/// PresenceSocketService), since it's meaningless outside an active game.
///
/// Event contract verified against backend/quiz-service/src/socket/ and
/// quizapp/src/app/components/pages/QuizPlayPage.tsx. Both `game_ended` and
/// the frontend's occasional `game_over` naming are listened for defensively.
class QuizSocketService {
  io.Socket? _socket;

  void connect({
    required String accessToken,
    required void Function(Map<String, dynamic>) onPlayerJoined,
    required void Function(Map<String, dynamic>) onPlayersList,
    required void Function(Map<String, dynamic>) onGameStarted,
    required void Function(Map<String, dynamic>) onQuestion,
    required void Function(Map<String, dynamic>) onQuestionEnded,
    required void Function(Map<String, dynamic>) onLeaderboardUpdate,
    required void Function(Map<String, dynamic>) onGameEnded,
    required void Function(Map<String, dynamic>) onAlreadyAttempted,
    required void Function(Map<String, dynamic>) onPlayerLeft,
    required void Function(Map<String, dynamic>) onGameError,
    required void Function() onDisconnect,
  }) {
    disconnect();
    final socket = buildSocket(path: '/quiz.io/', accessToken: accessToken);
    _socket = socket;

    socket.on('player_joined', (d) => onPlayerJoined(_asMap(d)));
    socket.on('players_list', (d) => onPlayersList(_asMap(d)));
    socket.on('game_started', (d) => onGameStarted(_asMap(d)));
    socket.on('quiz_activated', (d) => onGameStarted(_asMap(d)));
    socket.on('question', (d) => onQuestion(_asMap(d)));
    socket.on('question_ended', (d) => onQuestionEnded(_asMap(d)));
    socket.on('leaderboard_update', (d) => onLeaderboardUpdate(_asMap(d)));
    socket.on('game_ended', (d) => onGameEnded(_asMap(d)));
    socket.on('game_over', (d) => onGameEnded(_asMap(d)));
    socket.on('already_attempted', (d) => onAlreadyAttempted(_asMap(d)));
    socket.on('player_left', (d) => onPlayerLeft(_asMap(d)));
    socket.on('game_error', (d) => onGameError(_asMap(d)));
    socket.onDisconnect((_) => onDisconnect());

    socket.connect();
  }

  void joinGame({required String quizId, required String userName, String? userAvatar}) {
    _socket?.emit('join_game', {
      'quizId': quizId,
      'userName': userName,
      if (userAvatar != null) 'userAvatar': userAvatar,
    });
  }

  void submitAnswer({
    required String quizId,
    required String questionId,
    required int questionIndex,
    required int answer,
  }) {
    _socket?.emit('submit_answer', {
      'quizId': quizId,
      'questionId': questionId,
      'questionIndex': questionIndex,
      'answer': answer,
    });
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }

  Map<String, dynamic> _asMap(dynamic data) {
    if (data is Map) return Map<String, dynamic>.from(data);
    return {};
  }
}
