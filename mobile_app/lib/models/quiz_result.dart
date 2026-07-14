import 'package:freezed_annotation/freezed_annotation.dart';

part 'quiz_result.freezed.dart';
part 'quiz_result.g.dart';

@freezed
class TopPlayer with _$TopPlayer {
  const factory TopPlayer({
    int? rank,
    String? name,
    @Default(0) int score,
    @Default(0) int total,
    @Default(0) double percentage,
  }) = _TopPlayer;

  factory TopPlayer.fromJson(Map<String, dynamic> json) => _$TopPlayerFromJson(json);
}

/// Embedded on a Post when a user shares their quiz result to the feed, and
/// standalone as the payload of GET /api/quizzes/:id/my-history.
@freezed
class QuizResult with _$QuizResult {
  const factory QuizResult({
    required String quizId,
    required String quizTitle,
    String? category,
    @Default(0) int score,
    @Default(0) int total,
    @Default(0) double percentage,
    int? rank,
    @Default(0) int duration,
    String? date,
    @Default(<int>[]) List<int> answers,
    int? playerCount,
    double? avgPercentage,
    @Default(<TopPlayer>[]) List<TopPlayer> topPlayers,
  }) = _QuizResult;

  factory QuizResult.fromJson(Map<String, dynamic> json) => _$QuizResultFromJson(json);
}
