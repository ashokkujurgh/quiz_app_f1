import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../../models/post.dart';

class PostCard extends StatelessWidget {
  const PostCard({
    super.key,
    required this.post,
    this.onTap,
    this.onLike,
    this.onSave,
    this.onComment,
  });

  final Post post;
  final VoidCallback? onTap;
  final VoidCallback? onLike;
  final VoidCallback? onSave;
  final VoidCallback? onComment;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundImage: post.author.avatar != null ? CachedNetworkImageProvider(post.author.avatar!) : null,
                    child: post.author.avatar == null ? Text(post.author.name.characters.first.toUpperCase()) : null,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(post.author.name, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
                        Text(
                          '@${post.author.username} · ${timeago.format(DateTime.tryParse(post.createdAt) ?? DateTime.now())}',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  if (post.subTopic != null || post.topic.isNotEmpty)
                    Chip(
                      label: Text(post.subTopic ?? post.topic),
                      visualDensity: VisualDensity.compact,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                ],
              ),
              const SizedBox(height: 10),
              if (post.title != null && post.title!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(post.title!, style: theme.textTheme.titleMedium),
                ),
              Text(
                post.content,
                maxLines: 5,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium,
              ),
              if (post.displayImages.isNotEmpty) ...[
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: AspectRatio(
                    aspectRatio: 16 / 9,
                    child: CachedNetworkImage(
                      imageUrl: post.displayImages.first,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(color: theme.colorScheme.surfaceContainerHighest),
                      errorWidget: (_, __, ___) => const SizedBox.shrink(),
                    ),
                  ),
                ),
              ],
              if (post.quizResult != null) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.emoji_events_outlined, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        '${post.quizResult!.quizTitle}: ${post.quizResult!.score}/${post.quizResult!.total}'
                        ' (${post.quizResult!.percentage.toStringAsFixed(0)}%)',
                        style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 8),
              Row(
                children: [
                  _ActionButton(
                    icon: post.liked ? Icons.favorite : Icons.favorite_border,
                    color: post.liked ? theme.colorScheme.error : null,
                    label: '${post.likes}',
                    onTap: onLike,
                  ),
                  const SizedBox(width: 16),
                  _ActionButton(
                    icon: Icons.mode_comment_outlined,
                    label: '${post.commentsCount}',
                    onTap: onComment,
                  ),
                  const SizedBox(width: 16),
                  _ActionButton(icon: Icons.share_outlined, label: '${post.shares}', onTap: null),
                  const Spacer(),
                  IconButton(
                    icon: Icon(post.saved ? Icons.bookmark : Icons.bookmark_border, size: 20),
                    onPressed: onSave,
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({required this.icon, required this.label, this.onTap, this.color});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: Row(
          children: [
            Icon(icon, size: 18, color: color ?? Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(width: 4),
            Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: color)),
          ],
        ),
      ),
    );
  }
}
