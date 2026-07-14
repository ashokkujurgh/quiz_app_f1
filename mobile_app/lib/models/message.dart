import 'package:freezed_annotation/freezed_annotation.dart';

part 'message.freezed.dart';
part 'message.g.dart';

@freezed
class Message with _$Message {
  const factory Message({
    required String id,
    required String conversationId,
    required String senderId,
    String? text,
    String? imageUrl,
    @Default(<String>[]) List<String> readBy,
    required String createdAt,
    // Client-only field for optimistic-send reconciliation, never sent to
    // or received verbatim from the server.
    String? clientTempId,
  }) = _Message;

  factory Message.fromJson(Map<String, dynamic> json) => _$MessageFromJson(_normalize(json));

  static Map<String, dynamic> _normalize(Map<String, dynamic> json) {
    var out = json;
    if (out.containsKey('_id') && !out.containsKey('id')) {
      out = {...out, 'id': out['_id']};
    }
    if (out.containsKey('conversation') && !out.containsKey('conversationId')) {
      final conv = out['conversation'];
      out = {...out, 'conversationId': conv is Map ? (conv['_id'] ?? conv['id']) : conv};
    }
    if (out.containsKey('sender') && !out.containsKey('senderId')) {
      final sender = out['sender'];
      out = {...out, 'senderId': sender is Map ? (sender['_id'] ?? sender['id']) : sender};
    }
    return out;
  }
}
