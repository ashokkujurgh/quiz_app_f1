import 'package:freezed_annotation/freezed_annotation.dart';

part 'leaderboard_entry.freezed.dart';
part 'leaderboard_entry.g.dart';

/// A single row from either leaderboard endpoint — the two have genuinely
/// different shapes, verified directly against
/// backend/quiz-service/src/controllers/quizController.ts:
/// - GET /api/quizzes/:id/leaderboard (per-quiz): rank, userId, userName,
///   userAvatar, score, total, percentage, timeTaken.
/// - GET /api/quizzes/leaderboard/global (all-time aggregate, no period
///   filter exists server-side despite the web app having weekly/monthly
///   tabs — those are unsupported today): rank, userId, userName,
///   userAvatar, totalGames, totalScore, totalQuestions, avgPercentage,
///   perfectScores.
@freezed
class LeaderboardEntry with _$LeaderboardEntry {
  const factory LeaderboardEntry({
    required int rank,
    required String userId,
    required String userName,
    String? userAvatar,
    // Per-quiz fields
    @Default(0) int score,
    @Default(0) int total,
    @Default(0) double percentage,
    @Default(0) int timeTaken,
    // Global aggregate fields
    int? totalGames,
    int? totalScore,
    int? totalQuestions,
    int? avgPercentage,
    int? perfectScores,
  }) = _LeaderboardEntry;

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) =>
      _$LeaderboardEntryFromJson(json);
}
