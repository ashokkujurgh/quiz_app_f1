import 'package:freezed_annotation/freezed_annotation.dart';

part 'quiz.freezed.dart';
part 'quiz.g.dart';

/// Mirrors backend/quiz-service/src/models/Quiz.ts exactly — verified against
/// source (no difficulty/rating/plays fields exist server-side).
@freezed
class Quiz with _$Quiz {
  const factory Quiz({
    required String id,
    required String title,
    @Default('') String description,
    required int questionCount,
    @Default('random') String selectionMode,
    @Default(<String>[]) List<String> questions,
    String? topic,
    String? subTopic,
    String? image,
    @Default('Asia/Kolkata') String timezone,
    required String scheduledAt,
    @Default(30) int durationMinutes,
    int? timeLimitPerQuestion,
    @Default('once') String scheduleType,
    @Default('public') String participation,
    @Default(<String>[]) List<String> allowedUsers,
    @Default('draft') String status,
    String? startedAt,
    String? endedAt,
    @Default(false) bool postCreated,
    required String createdBy,
  }) = _Quiz;

  factory Quiz.fromJson(Map<String, dynamic> json) => _$QuizFromJson(_normalize(json));

  static Map<String, dynamic> _normalize(Map<String, dynamic> json) {
    var out = json;
    if (out.containsKey('_id') && !out.containsKey('id')) {
      out = {...out, 'id': out['_id']};
    }
    // topic/subTopic/createdBy may arrive populated (object) or as a raw id.
    for (final key in ['topic', 'subTopic', 'createdBy']) {
      final value = out[key];
      if (value is Map) {
        out = {...out, key: value['_id'] ?? value['id']};
      }
    }
    if (out['questions'] is List) {
      out = {
        ...out,
        'questions': (out['questions'] as List)
            .map((q) => q is Map ? (q['_id'] ?? q['id']) : q)
            .toList(),
      };
    }
    return out;
  }
}

extension QuizX on Quiz {
  bool get isLive => status == 'active';
  bool get isUpcoming => status == 'scheduled';
  bool get isCompleted => status == 'completed';
}
