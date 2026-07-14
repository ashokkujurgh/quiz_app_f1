import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/utils/optimistic_mutation.dart';
import '../../../models/post.dart';
import '../data/posts_repository.dart';

part 'feed_controller.g.dart';

class FeedState {
  FeedState({
    required this.posts,
    required this.activeTopic,
    required this.page,
    required this.hasMore,
    this.loadingMore = false,
  });

  final List<Post> posts;
  final String activeTopic; // 'All' or a topic name
  final int page;
  final bool hasMore;
  final bool loadingMore;

  FeedState copyWith({
    List<Post>? posts,
    String? activeTopic,
    int? page,
    bool? hasMore,
    bool? loadingMore,
  }) {
    return FeedState(
      posts: posts ?? this.posts,
      activeTopic: activeTopic ?? this.activeTopic,
      page: page ?? this.page,
      hasMore: hasMore ?? this.hasMore,
      loadingMore: loadingMore ?? this.loadingMore,
    );
  }
}

@riverpod
class FeedController extends _$FeedController {
  @override
  Future<FeedState> build() async {
    return _fetchFirstPage('All');
  }

  Future<FeedState> _fetchFirstPage(String topic) async {
    final result = await ref.read(postsRepositoryProvider).getPosts(topic: topic, page: 1);
    return FeedState(
      posts: result.posts,
      activeTopic: topic,
      page: 1,
      hasMore: result.page < result.pages,
    );
  }

  Future<void> setActiveTopic(String topic) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetchFirstPage(topic));
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;

    state = AsyncData(current.copyWith(loadingMore: true));
    try {
      final nextPage = current.page + 1;
      final result = await ref.read(postsRepositoryProvider).getPosts(
            topic: current.activeTopic,
            page: nextPage,
          );
      state = AsyncData(current.copyWith(
        posts: [...current.posts, ...result.posts],
        page: nextPage,
        hasMore: result.page < result.pages,
        loadingMore: false,
      ));
    } catch (_) {
      state = AsyncData(current.copyWith(loadingMore: false));
    }
  }

  Future<void> refresh() async {
    final topic = state.value?.activeTopic ?? 'All';
    state = await AsyncValue.guard(() => _fetchFirstPage(topic));
  }

  void prependPost(Post post) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(posts: [post, ...current.posts]));
  }

  Future<void> toggleLike(String postId) async {
    final current = state.value;
    if (current == null) return;

    await runOptimistic<List<Post>>(
      getCurrent: () => state.value!.posts,
      setState: (posts) => state = AsyncData(state.value!.copyWith(posts: posts)),
      optimisticUpdate: (posts) => posts.map((p) {
        if (p.id != postId) return p;
        return p.copyWith(liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1);
      }).toList(),
      action: () => ref.read(postsRepositoryProvider).toggleLike(postId),
    );
  }

  Future<void> toggleSave(String postId) async {
    final current = state.value;
    if (current == null) return;

    await runOptimistic<List<Post>>(
      getCurrent: () => state.value!.posts,
      setState: (posts) => state = AsyncData(state.value!.copyWith(posts: posts)),
      optimisticUpdate: (posts) => posts.map((p) {
        if (p.id != postId) return p;
        return p.copyWith(saved: !p.saved);
      }).toList(),
      action: () => ref.read(postsRepositoryProvider).toggleSave(postId),
    );
  }
}
