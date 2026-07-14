import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/state/auth_controller.dart';
import '../state/post_detail_controller.dart';
import '../widgets/comment_tile.dart';
import '../../home_feed/widgets/post_card.dart';

class PostDetailScreen extends ConsumerStatefulWidget {
  const PostDetailScreen({super.key, required this.idOrSlug});

  final String idOrSlug;

  @override
  ConsumerState<PostDetailScreen> createState() => _PostDetailScreenState();
}

class _PostDetailScreenState extends ConsumerState<PostDetailScreen> {
  final _commentController = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submitComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await ref.read(postDetailControllerProvider(widget.idOrSlug).notifier).addComment(text);
      _commentController.clear();
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(postDetailControllerProvider(widget.idOrSlug));
    final currentUserId = ref.watch(authControllerProvider).valueOrNull?.id;

    return Scaffold(
      appBar: AppBar(title: const Text('Post')),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load post: $err')),
        data: (detail) => Column(
          children: [
            Expanded(
              child: ListView(
                children: [
                  PostCard(
                    post: detail.post,
                    onLike: () => ref.read(postDetailControllerProvider(widget.idOrSlug).notifier).toggleLike(),
                    onSave: () => ref.read(postDetailControllerProvider(widget.idOrSlug).notifier).toggleSave(),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Divider(),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text('Comments (${detail.comments.length})', style: Theme.of(context).textTheme.titleMedium),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      children: [
                        for (final comment in detail.comments)
                          CommentTile(
                            comment: comment,
                            canDelete: comment.author.userId == currentUserId,
                            onDelete: () => ref
                                .read(postDetailControllerProvider(widget.idOrSlug).notifier)
                                .deleteComment(comment.id),
                          ),
                        if (detail.comments.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 24),
                            child: Text('No comments yet.'),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _commentController,
                        decoration: const InputDecoration(hintText: 'Write a comment…'),
                      ),
                    ),
                    IconButton(
                      icon: _sending
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.send),
                      onPressed: _sending ? null : _submitComment,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
