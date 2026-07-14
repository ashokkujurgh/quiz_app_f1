// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'question.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$QuestionOptionImpl _$$QuestionOptionImplFromJson(Map<String, dynamic> json) =>
    _$QuestionOptionImpl(text: json['text'] as String);

Map<String, dynamic> _$$QuestionOptionImplToJson(
  _$QuestionOptionImpl instance,
) => <String, dynamic>{'text': instance.text};

_$QuestionImpl _$$QuestionImplFromJson(Map<String, dynamic> json) =>
    _$QuestionImpl(
      id: json['id'] as String,
      text: json['text'] as String,
      description: json['description'] as String?,
      options:
          (json['options'] as List<dynamic>)
              .map((e) => QuestionOption.fromJson(e as Map<String, dynamic>))
              .toList(),
      correctOption: (json['correctOption'] as num).toInt(),
      topic: json['topic'] as String,
      subTopic: json['subTopic'] as String?,
      difficulty: json['difficulty'] as String? ?? 'medium',
      isActive: json['isActive'] as bool? ?? true,
    );

Map<String, dynamic> _$$QuestionImplToJson(_$QuestionImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'text': instance.text,
      'description': instance.description,
      'options': instance.options,
      'correctOption': instance.correctOption,
      'topic': instance.topic,
      'subTopic': instance.subTopic,
      'difficulty': instance.difficulty,
      'isActive': instance.isActive,
    };
