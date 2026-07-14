import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../home_feed/widgets/create_post_sheet.dart';
import '../../home_feed/widgets/post_card.dart';
import '../state/my_posts_controller.dart';

/// The current user's own posts, with edit/delete affordances — mirrors
/// PostsPage.tsx.
class PostsScreen extends ConsumerWidget {
  const PostsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final postsAsync = ref.watch(myPostsControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My Posts')),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final post = await showCreatePostSheet(context);
          if (post != null) ref.read(myPostsControllerProvider.notifier).refresh();
        },
        child: const Icon(Icons.add),
      ),
      body: postsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load posts: $err')),
        data: (posts) => RefreshIndicator(
          onRefresh: () => ref.read(myPostsControllerProvider.notifier).refresh(),
          child: posts.isEmpty
              ? ListView(
                  children: const [
                    Padding(
                      padding: EdgeInsets.all(48),
                      child: Center(child: Text("You haven't posted anything yet.")),
                    ),
                  ],
                )
              : ListView(
                  children: [
                    for (final post in posts)
                      Dismissible(
                        key: ValueKey(post.id),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 24),
                          color: Theme.of(context).colorScheme.error,
                          child: const Icon(Icons.delete, color: Colors.white),
                        ),
                        confirmDismiss: (_) => showDialog<bool>(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: const Text('Delete post?'),
                            content: const Text('This cannot be undone.'),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                              TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
                            ],
                          ),
                        ),
                        onDismissed: (_) => ref.read(myPostsControllerProvider.notifier).deletePost(post.id),
                        child: PostCard(
                          post: post,
                          onTap: () => context.push('/posts/${post.slug ?? post.id}'),
                        ),
                      ),
                  ],
                ),
        ),
      ),
    );
  }
}
