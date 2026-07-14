import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../models/user.dart';
import '../../friends/data/friends_repository.dart';
import '../../friends/state/friends_controller.dart';
import '../../messages/state/conversations_controller.dart';

class RelationshipActionButton extends ConsumerStatefulWidget {
  const RelationshipActionButton({super.key, required this.user, required this.status});

  final User user;
  final FriendshipStatus status;

  @override
  ConsumerState<RelationshipActionButton> createState() => _RelationshipActionButtonState();
}

class _RelationshipActionButtonState extends ConsumerState<RelationshipActionButton> {
  bool _busy = false;

  Future<void> _sendRequest() async {
    setState(() => _busy = true);
    try {
      await ref.read(friendsControllerProvider.notifier).sendRequest(widget.user);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _message() async {
    final conv = await ref.read(conversationsControllerProvider.notifier).openConversation(widget.user.id);
    if (mounted) context.push('/messages/${conv.id}');
  }

  @override
  Widget build(BuildContext context) {
    return switch (widget.status) {
      FriendshipStatus.none => ElevatedButton.icon(
          onPressed: _busy ? null : _sendRequest,
          icon: const Icon(Icons.person_add_outlined),
          label: const Text('Add Friend'),
        ),
      FriendshipStatus.pendingSent => const OutlinedButton(onPressed: null, child: Text('Request Sent')),
      FriendshipStatus.pendingReceived => FilledButton.tonal(
          onPressed: () => context.push('/friends'),
          child: const Text('Respond in Friends'),
        ),
      FriendshipStatus.accepted => Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            ElevatedButton.icon(
              onPressed: _message,
              icon: const Icon(Icons.chat_bubble_outline),
              label: const Text('Message'),
            ),
          ],
        ),
      FriendshipStatus.blocked => const SizedBox.shrink(),
    };
  }
}
