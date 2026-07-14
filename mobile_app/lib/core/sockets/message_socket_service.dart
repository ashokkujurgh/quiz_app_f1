import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

import 'socket_base.dart';

/// Verified against backend/message-service/src/socket/chatHandler.ts:
/// - The server auto-joins every connected socket to a personal `user:{id}`
///   room, and `message:new` is broadcast to participants' PERSONAL rooms,
///   NOT a `conv:{id}` room — so it arrives regardless of whether the client
///   has called conversation:join for that specific conversation.
/// - conversation:join/leave only affects the `conv:{id}` room used for
///   typing indicators and read-receipt broadcasts.
/// - Sending a TEXT message happens by emitting `message:send` directly (the
///   server creates the Message doc from the socket event) — this is the
///   primary send path, not the REST POST endpoint.
/// - Image messages have no socket support at all (chatHandler only reads
///   `text`) — those must go through the REST endpoint after uploading.
///
/// Exposes broadcast streams (rather than fixed single callbacks like
/// QuizSocketService) because this service is shared across the whole
/// Messages feature — both the conversation list and an open thread need to
/// react to the same events independently.
class MessageSocketService {
  io.Socket? _socket;

  final _messageNewController = StreamController<Map<String, dynamic>>.broadcast();
  final _typingStartController = StreamController<Map<String, dynamic>>.broadcast();
  final _typingStopController = StreamController<Map<String, dynamic>>.broadcast();
  final _messageReadController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get onMessageNew => _messageNewController.stream;
  Stream<Map<String, dynamic>> get onTypingStart => _typingStartController.stream;
  Stream<Map<String, dynamic>> get onTypingStop => _typingStopController.stream;
  Stream<Map<String, dynamic>> get onMessageRead => _messageReadController.stream;

  void connect(String accessToken) {
    disconnect();
    final socket = buildSocket(path: '/messages.io/', accessToken: accessToken);
    _socket = socket;

    socket.on('message:new', (d) => _messageNewController.add(_asMap(d)));
    socket.on('typing:start', (d) => _typingStartController.add(_asMap(d)));
    socket.on('typing:stop', (d) => _typingStopController.add(_asMap(d)));
    socket.on('message:read', (d) => _messageReadController.add(_asMap(d)));

    socket.connect();
  }

  void joinConversation(String conversationId) => _socket?.emit('conversation:join', conversationId);
  void leaveConversation(String conversationId) => _socket?.emit('conversation:leave', conversationId);

  void sendTextMessage({required String conversationId, required String text}) {
    _socket?.emit('message:send', {'conversationId': conversationId, 'text': text});
  }

  void startTyping(String conversationId) => _socket?.emit('typing:start', conversationId);
  void stopTyping(String conversationId) => _socket?.emit('typing:stop', conversationId);
  void markRead(String conversationId) => _socket?.emit('message:read', conversationId);

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }

  void dispose() {
    disconnect();
    _messageNewController.close();
    _typingStartController.close();
    _typingStopController.close();
    _messageReadController.close();
  }

  Map<String, dynamic> _asMap(dynamic data) {
    if (data is Map) return Map<String, dynamic>.from(data);
    return {};
  }
}
