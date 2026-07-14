// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quiz.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$QuizImpl _$$QuizImplFromJson(Map<String, dynamic> json) => _$QuizImpl(
  id: json['id'] as String,
  title: json['title'] as String,
  description: json['description'] as String? ?? '',
  questionCount: (json['questionCount'] as num).toInt(),
  selectionMode: json['selectionMode'] as String? ?? 'random',
  questions:
      (json['questions'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const <String>[],
  topic: json['topic'] as String?,
  subTopic: json['subTopic'] as String?,
  image: json['image'] as String?,
  timezone: json['timezone'] as String? ?? 'Asia/Kolkata',
  scheduledAt: json['scheduledAt'] as String,
  durationMinutes: (json['durationMinutes'] as num?)?.toInt() ?? 30,
  timeLimitPerQuestion: (json['timeLimitPerQuestion'] as num?)?.toInt(),
  scheduleType: json['scheduleType'] as String? ?? 'once',
  participation: json['participation'] as String? ?? 'public',
  allowedUsers:
      (json['allowedUsers'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const <String>[],
  status: json['status'] as String? ?? 'draft',
  startedAt: json['startedAt'] as String?,
  endedAt: json['endedAt'] as String?,
  postCreated: json['postCreated'] as bool? ?? false,
  createdBy: json['createdBy'] as String,
);

Map<String, dynamic> _$$QuizImplToJson(_$QuizImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'description': instance.description,
      'questionCount': instance.questionCount,
      'selectionMode': instance.selectionMode,
      'questions': instance.questions,
      'topic': instance.topic,
      'subTopic': instance.subTopic,
      'image': instance.image,
      'timezone': instance.timezone,
      'scheduledAt': instance.scheduledAt,
      'durationMinutes': instance.durationMinutes,
      'timeLimitPerQuestion': instance.timeLimitPerQuestion,
      'scheduleType': instance.scheduleType,
      'participation': instance.participation,
      'allowedUsers': instance.allowedUsers,
      'status': instance.status,
      'startedAt': instance.startedAt,
      'endedAt': instance.endedAt,
      'postCreated': instance.postCreated,
      'createdBy': instance.createdBy,
    };
