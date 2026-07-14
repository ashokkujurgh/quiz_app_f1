import 'package:freezed_annotation/freezed_annotation.dart';

import 'message.dart';
import 'user.dart';

part 'conversation.freezed.dart';
part 'conversation.g.dart';

@freezed
class Conversation with _$Conversation {
  const factory Conversation({
    required String id,
    required User otherUser,
    Message? lastMessage,
    @Default(0) int unreadCount,
    required String updatedAt,
  }) = _Conversation;

  factory Conversation.fromJson(Map<String, dynamic> json) => _$ConversationFromJson(_normalize(json));

  static Map<String, dynamic> _normalize(Map<String, dynamic> json) {
    if (json.containsKey('_id') && !json.containsKey('id')) {
      return {...json, 'id': json['_id']};
    }
    return json;
  }
}
