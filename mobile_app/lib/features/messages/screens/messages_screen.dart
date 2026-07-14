import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../state/conversations_controller.dart';
import '../widgets/conversation_tile.dart';

/// The conversation list — mirrors the "conversation list" pane of
/// MessagesPage.tsx. Tapping a conversation pushes to the thread route.
class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stateAsync = ref.watch(conversationsControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load conversations: $err')),
        data: (state) => RefreshIndicator(
          onRefresh: () => ref.read(conversationsControllerProvider.notifier).refresh(),
          child: state.conversations.isEmpty
              ? ListView(
                  children: const [
                    Padding(
                      padding: EdgeInsets.all(48),
                      child: Center(child: Text('No conversations yet. Message a friend to get started!')),
                    ),
                  ],
                )
              : ListView.builder(
                  itemCount: state.conversations.length,
                  itemBuilder: (context, index) {
                    final conv = state.conversations[index];
                    return ConversationTile(
                      conversation: conv,
                      onTap: () => context.push('/messages/${conv.id}'),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
