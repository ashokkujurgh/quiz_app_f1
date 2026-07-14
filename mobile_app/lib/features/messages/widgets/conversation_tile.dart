import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../../core/sockets/presence_socket_service.dart';
import '../../../models/conversation.dart';

class ConversationTile extends ConsumerWidget {
  const ConversationTile({super.key, required this.conversation, required this.onTap});

  final Conversation conversation;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final onlineIds = ref.watch(onlineUserIdsProvider);
    final isOnline = onlineIds.contains(conversation.otherUser.id);
    final lastMessage = conversation.lastMessage;

    return ListTile(
      onTap: onTap,
      leading: Stack(
        children: [
          CircleAvatar(
            backgroundImage: conversation.otherUser.avatar != null
                ? CachedNetworkImageProvider(conversation.otherUser.avatar!)
                : null,
            child: conversation.otherUser.avatar == null
                ? Text(conversation.otherUser.name.characters.first.toUpperCase())
                : null,
          ),
          if (isOnline)
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: Colors.green,
                  shape: BoxShape.circle,
                  border: Border.all(color: Theme.of(context).scaffoldBackgroundColor, width: 2),
                ),
              ),
            ),
        ],
      ),
      title: Text(conversation.otherUser.name),
      subtitle: Text(
        lastMessage == null
            ? 'Say hello 👋'
            : (lastMessage.text ?? (lastMessage.imageUrl != null ? '📷 Image' : '')),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            timeago.format(DateTime.tryParse(conversation.updatedAt) ?? DateTime.now()),
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (conversation.unreadCount > 0) ...[
            const SizedBox(height: 4),
            CircleAvatar(
              radius: 10,
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: Text('${conversation.unreadCount}', style: const TextStyle(fontSize: 11, color: Colors.white)),
            ),
          ],
        ],
      ),
    );
  }
}
