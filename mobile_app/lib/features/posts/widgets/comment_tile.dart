import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../../models/comment.dart';

class CommentTile extends StatelessWidget {
  const CommentTile({super.key, required this.comment, this.onDelete, this.canDelete = false});

  final Comment comment;
  final VoidCallback? onDelete;
  final bool canDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 16,
            backgroundImage: comment.author.avatar != null ? CachedNetworkImageProvider(comment.author.avatar!) : null,
            child: comment.author.avatar == null ? Text(comment.author.name.characters.first.toUpperCase()) : null,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(comment.author.name, style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w700)),
                      const SizedBox(width: 6),
                      Text(
                        timeago.format(DateTime.tryParse(comment.createdAt) ?? DateTime.now()),
                        style: theme.textTheme.bodySmall,
                      ),
                      if (canDelete) ...[
                        const Spacer(),
                        InkWell(
                          onTap: onDelete,
                          child: Icon(Icons.delete_outline, size: 16, color: theme.colorScheme.error),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(comment.content, style: theme.textTheme.bodyMedium),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
