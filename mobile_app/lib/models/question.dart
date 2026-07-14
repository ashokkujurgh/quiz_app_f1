import 'package:freezed_annotation/freezed_annotation.dart';

part 'question.freezed.dart';
part 'question.g.dart';

@freezed
class QuestionOption with _$QuestionOption {
  const factory QuestionOption({required String text}) = _QuestionOption;

  factory QuestionOption.fromJson(Map<String, dynamic> json) => _$QuestionOptionFromJson(json);
}

/// Mirrors backend/question-service/src/models/Question.ts.
@freezed
class Question with _$Question {
  const factory Question({
    required String id,
    required String text,
    String? description,
    required List<QuestionOption> options,
    required int correctOption,
    required String topic,
    String? subTopic,
    @Default('medium') String difficulty,
    @Default(true) bool isActive,
  }) = _Question;

  factory Question.fromJson(Map<String, dynamic> json) => _$QuestionFromJson(_normalize(json));

  static Map<String, dynamic> _normalize(Map<String, dynamic> json) {
    var out = json;
    if (out.containsKey('_id') && !out.containsKey('id')) {
      out = {...out, 'id': out['_id']};
    }
    for (final key in ['topic', 'subTopic']) {
      final value = out[key];
      if (value is Map) {
        out = {...out, key: value['_id'] ?? value['id']};
      }
    }
    return out;
  }
}
