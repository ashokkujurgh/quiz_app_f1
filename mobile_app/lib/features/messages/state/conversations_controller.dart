import 'dart:async';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../models/conversation.dart';
import '../../../models/message.dart';
import '../data/messages_repository.dart';
import 'messages_socket_provider.dart';

part 'conversations_controller.g.dart';

class ConversationsState {
  ConversationsState({required this.conversations, this.activeConversationId});
  final List<Conversation> conversations;
  final String? activeConversationId;

  ConversationsState copyWith({List<Conversation>? conversations, String? activeConversationId}) {
    return ConversationsState(
      conversations: conversations ?? this.conversations,
      activeConversationId: activeConversationId ?? this.activeConversationId,
    );
  }
}

@riverpod
class ConversationsController extends _$ConversationsController {
  StreamSubscription<Map<String, dynamic>>? _sub;

  @override
  Future<ConversationsState> build() async {
    final list = await ref.read(messagesRepositoryProvider).getConversations();
    final socket = await ref.watch(messagesSocketProvider.future);
    _sub?.cancel();
    _sub = socket.onMessageNew.listen(_onMessageNew);
    ref.onDispose(() => _sub?.cancel());
    return ConversationsState(conversations: list);
  }

  void setActiveConversation(String? conversationId) {
    final current = state.value;
    if (current == null) return;
    final conversations = conversationId == null
        ? current.conversations
        : current.conversations.map((c) => c.id == conversationId ? c.copyWith(unreadCount: 0) : c).toList();
    state = AsyncData(ConversationsState(conversations: conversations, activeConversationId: conversationId));
  }

  Future<Conversation> openConversation(String userId) {
    return ref.read(messagesRepositoryProvider).openConversation(userId);
  }

  Future<void> refresh() async {
    final list = await ref.read(messagesRepositoryProvider).getConversations();
    state = AsyncData(ConversationsState(conversations: list, activeConversationId: state.value?.activeConversationId));
  }

  void _onMessageNew(Map<String, dynamic> data) {
    final current = state.value;
    if (current == null) return;
    final message = Message.fromJson(data);
    final index = current.conversations.indexWhere((c) => c.id == message.conversationId);
    if (index == -1) {
      // A brand-new conversation we don't have locally yet — refresh from REST.
      refresh();
      return;
    }
    final isActive = current.activeConversationId == message.conversationId;
    final updated = current.conversations[index].copyWith(
      lastMessage: message,
      unreadCount: isActive ? 0 : current.conversations[index].unreadCount + 1,
      updatedAt: message.createdAt,
    );
    state = AsyncData(current.copyWith(
      conversations: [updated, ...current.conversations.where((c) => c.id != message.conversationId)],
    ));
  }
}
