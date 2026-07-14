import 'package:freezed_annotation/freezed_annotation.dart';

part 'topic.freezed.dart';
part 'topic.g.dart';

@freezed
class Topic with _$Topic {
  const factory Topic({
    required String id,
    required String name,
    String? description,
    @Default(true) bool isActive,
    @Default(0) int subTopicCount,
  }) = _Topic;

  factory Topic.fromJson(Map<String, dynamic> json) => _$TopicFromJson(_normalize(json));

  static Map<String, dynamic> _normalize(Map<String, dynamic> json) {
    if (json.containsKey('_id') && !json.containsKey('id')) {
      return {...json, 'id': json['_id']};
    }
    return json;
  }
}

@freezed
class SubTopic with _$SubTopic {
  const factory SubTopic({
    required String id,
    required String name,
    String? description,
    required String topic,
    @Default(true) bool isActive,
  }) = _SubTopic;

  factory SubTopic.fromJson(Map<String, dynamic> json) => _$SubTopicFromJson(_normalize(json));

  static Map<String, dynamic> _normalize(Map<String, dynamic> json) {
    var out = json;
    if (out.containsKey('_id') && !out.containsKey('id')) {
      out = {...out, 'id': out['_id']};
    }
    // topic can arrive as a populated object or a plain ObjectId string.
    if (out['topic'] is Map) {
      out = {...out, 'topic': (out['topic'] as Map)['_id'] ?? (out['topic'] as Map)['id']};
    }
    return out;
  }
}
