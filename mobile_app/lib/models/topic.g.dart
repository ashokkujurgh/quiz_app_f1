// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'topic.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TopicImpl _$$TopicImplFromJson(Map<String, dynamic> json) => _$TopicImpl(
  id: json['id'] as String,
  name: json['name'] as String,
  description: json['description'] as String?,
  isActive: json['isActive'] as bool? ?? true,
  subTopicCount: (json['subTopicCount'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$$TopicImplToJson(_$TopicImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'isActive': instance.isActive,
      'subTopicCount': instance.subTopicCount,
    };

_$SubTopicImpl _$$SubTopicImplFromJson(Map<String, dynamic> json) =>
    _$SubTopicImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      topic: json['topic'] as String,
      isActive: json['isActive'] as bool? ?? true,
    );

Map<String, dynamic> _$$SubTopicImplToJson(_$SubTopicImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'topic': instance.topic,
      'isActive': instance.isActive,
    };
