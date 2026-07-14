import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../models/leaderboard_entry.dart';

part 'quiz_play_state.freezed.dart';

@freezed
class QuizPlayer with _$QuizPlayer {
  const factory QuizPlayer({required String userId, required String userName, String? userAvatar}) = _QuizPlayer;
}

@freezed
class LiveQuestion with _$LiveQuestion {
  const factory LiveQuestion({
    required int questionIndex,
    required String questionId,
    required String question,
    required List<String> options,
    required int timeLimit,
    required int total,
  }) = _LiveQuestion;
}

/// Sealed state for an in-progress or finished quiz-play session, ported
/// field-by-field from QuizPlayPage.tsx's local useState transitions (that
/// file is the working reference for every edge case — already-attempted,
/// disconnect, player-left, error).
@freezed
sealed class QuizPlayState with _$QuizPlayState {
  const factory QuizPlayState.connecting() = QuizPlayConnecting;

  const factory QuizPlayState.lobby({
    @Default(<QuizPlayer>[]) List<QuizPlayer> players,
  }) = QuizPlayLobby;

  /// mode == 'per_question': server pushes one question at a time.
  const factory QuizPlayState.perQuestionRound({
    required LiveQuestion question,
    required int timeLeft,
    int? selectedOption,
    @Default(<QuizPlayer>[]) List<QuizPlayer> players,
    @Default(<LeaderboardEntry>[]) List<LeaderboardEntry> liveScores,
  }) = QuizPlayPerQuestionRound;

  const factory QuizPlayState.perQuestionEnded({
    required LiveQuestion question,
    required int correctOption,
    int? selectedOption,
    @Default(<QuizPlayer>[]) List<QuizPlayer> players,
    @Default(<LeaderboardEntry>[]) List<LeaderboardEntry> liveScores,
  }) = QuizPlayPerQuestionEnded;

  /// mode == 'total_timer': all questions delivered upfront, client owns
  /// navigation and a single shared countdown for the whole quiz.
  const factory QuizPlayState.totalTimerRound({
    required List<LiveQuestion> questions,
    required int currentIndex,
    required Map<int, int> answers, // questionIndex -> selected option
    required int timeLeft,
  }) = QuizPlayTotalTimerRound;

  const factory QuizPlayState.ended({
    required List<LeaderboardEntry> leaderboard,
    String? quizTitle,
  }) = QuizPlayEnded;

  const factory QuizPlayState.alreadyAttempted({String? message}) = QuizPlayAlreadyAttempted;

  const factory QuizPlayState.error(String message) = QuizPlayError;
}
