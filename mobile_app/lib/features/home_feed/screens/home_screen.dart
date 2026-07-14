import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../auth/state/auth_controller.dart';
import '../state/feed_controller.dart';
import '../widgets/create_post_sheet.dart';
import '../widgets/post_card.dart';
import '../widgets/topic_chip_row.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(() {
      if (_scrollController.position.pixels > _scrollController.position.maxScrollExtent - 300) {
        ref.read(feedControllerProvider.notifier).loadMore();
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final feedAsync = ref.watch(feedControllerProvider);
    final user = ref.watch(authControllerProvider).valueOrNull;

    return Scaffold(
      appBar: AppBar(
        title: Text(user != null ? 'Welcome, ${user.name}' : 'Meenzo'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push(RoutePaths.notifications),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final post = await showCreatePostSheet(context);
          if (post != null) ref.read(feedControllerProvider.notifier).prependPost(post);
        },
        child: const Icon(Icons.add),
      ),
      body: feedAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load feed: $err')),
        data: (feed) => RefreshIndicator(
          onRefresh: () => ref.read(feedControllerProvider.notifier).refresh(),
          child: ListView(
            controller: _scrollController,
            children: [
              const SizedBox(height: 8),
              TopicChipRow(
                selected: feed.activeTopic,
                onSelected: (topic) => ref.read(feedControllerProvider.notifier).setActiveTopic(topic),
              ),
              const SizedBox(height: 8),
              if (feed.posts.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(48),
                  child: Center(child: Text('No posts yet. Be the first to share something!')),
                ),
              for (final post in feed.posts)
                PostCard(
                  post: post,
                  onTap: () => context.push('/posts/${post.slug ?? post.id}'),
                  onLike: () => ref.read(feedControllerProvider.notifier).toggleLike(post.id),
                  onSave: () => ref.read(feedControllerProvider.notifier).toggleSave(post.id),
                  onComment: () => context.push('/posts/${post.slug ?? post.id}'),
                ),
              if (feed.loadingMore)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: CircularProgressIndicator()),
                ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
