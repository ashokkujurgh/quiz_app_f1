import 'dart:async';

import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:uuid/uuid.dart';

import '../../../models/message.dart';
import '../../auth/state/auth_controller.dart';
import '../data/messages_repository.dart';
import 'messages_socket_provider.dart';

part 'active_thread_controller.g.dart';

class ActiveThreadState {
  ActiveThreadState({required this.messages, this.otherUserTyping = false});
  final List<Message> messages;
  final bool otherUserTyping;

  ActiveThreadState copyWith({List<Message>? messages, bool? otherUserTyping}) {
    return ActiveThreadState(
      messages: messages ?? this.messages,
      otherUserTyping: otherUserTyping ?? this.otherUserTyping,
    );
  }
}

const _uuid = Uuid();

@riverpod
class ActiveThreadController extends _$ActiveThreadController {
  StreamSubscription<Map<String, dynamic>>? _messageSub;
  StreamSubscription<Map<String, dynamic>>? _typingStartSub;
  StreamSubscription<Map<String, dynamic>>? _typingStopSub;
  Timer? _typingStopTimer;

  @override
  Future<ActiveThreadState> build(String conversationId) async {
    final messages = await ref.read(messagesRepositoryProvider).getMessages(conversationId);
    final socket = await ref.watch(messagesSocketProvider.future);

    socket.joinConversation(conversationId);
    unawaited(ref.read(messagesRepositoryProvider).markRead(conversationId));
    socket.markRead(conversationId);

    _messageSub?.cancel();
    _messageSub = socket.onMessageNew.listen(_onMessageNew);
    _typingStartSub?.cancel();
    _typingStartSub = socket.onTypingStart.listen((d) => _onTyping(d, true));
    _typingStopSub?.cancel();
    _typingStopSub = socket.onTypingStop.listen((d) => _onTyping(d, false));

    ref.onDispose(() {
      _messageSub?.cancel();
      _typingStartSub?.cancel();
      _typingStopSub?.cancel();
      _typingStopTimer?.cancel();
      socket.leaveConversation(conversationId);
    });

    return ActiveThreadState(messages: messages);
  }

  Future<void> sendText(String text) async {
    final current = state.value;
    final me = ref.read(authControllerProvider).valueOrNull;
    if (current == null || me == null || text.trim().isEmpty) return;

    final tempId = _uuid.v4();
    final optimistic = Message(
      id: tempId,
      conversationId: conversationId,
      senderId: me.id,
      text: text.trim(),
      createdAt: DateTime.now().toIso8601String(),
      clientTempId: tempId,
    );
    state = AsyncData(current.copyWith(messages: [...current.messages, optimistic]));

    final socket = await ref.read(messagesSocketProvider.future);
    socket.sendTextMessage(conversationId: conversationId, text: text.trim());
  }

  Future<void> sendImage(String filePath) async {
    final repo = ref.read(messagesRepositoryProvider);
    final url = await repo.uploadImage(filePath);
    final message = await repo.sendImageMessage(conversationId, url);
    final current = state.value;
    if (current == null) return;
    if (current.messages.any((m) => m.id == message.id)) return;
    state = AsyncData(current.copyWith(messages: [...current.messages, message]));
  }

  Future<void> onTypingChanged(bool isTyping) async {
    final socket = await ref.read(messagesSocketProvider.future);
    _typingStopTimer?.cancel();
    if (isTyping) {
      socket.startTyping(conversationId);
      _typingStopTimer = Timer(const Duration(seconds: 3), () => socket.stopTyping(conversationId));
    } else {
      socket.stopTyping(conversationId);
    }
  }

  void _onMessageNew(Map<String, dynamic> data) {
    final current = state.value;
    if (current == null) return;
    final incoming = Message.fromJson(data);
    if (incoming.conversationId != conversationId) return;
    // Already reconciled (e.g. the REST-driven image-send echo arriving over
    // the socket too) — the server emits message:new for both send paths.
    if (current.messages.any((m) => m.id == incoming.id)) return;

    final me = ref.read(authControllerProvider).valueOrNull;
    if (me != null && incoming.senderId == me.id) {
      // My own message echoed back — replace the optimistic temp bubble with
      // the same text if one is still unreconciled, rather than appending a
      // second copy.
      final tempIndex = current.messages.indexWhere(
        (m) => m.clientTempId != null && m.text == incoming.text,
      );
      if (tempIndex != -1) {
        final updated = [...current.messages];
        updated[tempIndex] = incoming;
        state = AsyncData(current.copyWith(messages: updated));
        return;
      }
    }

    state = AsyncData(current.copyWith(messages: [...current.messages, incoming]));
  }

  void _onTyping(Map<String, dynamic> data, bool isTyping) {
    final current = state.value;
    if (current == null) return;
    final me = ref.read(authControllerProvider).valueOrNull;
    // Ignore our own typing echo, if any — only reflect the other participant.
    if (me != null && data['userId']?.toString() == me.id) return;
    state = AsyncData(current.copyWith(otherUserTyping: isTyping));
  }
}
