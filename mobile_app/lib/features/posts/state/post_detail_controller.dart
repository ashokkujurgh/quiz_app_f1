import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/utils/optimistic_mutation.dart';
import '../../../models/comment.dart';
import '../../../models/post.dart';
import '../../home_feed/data/posts_repository.dart';

part 'post_detail_controller.g.dart';

class PostDetailState {
  PostDetailState({required this.post, required this.comments});
  final Post post;
  final List<Comment> comments;

  PostDetailState copyWith({Post? post, List<Comment>? comments}) {
    return PostDetailState(post: post ?? this.post, comments: comments ?? this.comments);
  }
}

@riverpod
class PostDetailController extends _$PostDetailController {
  @override
  Future<PostDetailState> build(String idOrSlug) async {
    final repo = ref.read(postsRepositoryProvider);
    final post = await repo.getPost(idOrSlug);
    final comments = await repo.getComments(post.id);
    return PostDetailState(post: post, comments: comments);
  }

  Future<void> toggleLike() async {
    final current = state.value;
    if (current == null) return;
    await runOptimistic<Post>(
      getCurrent: () => state.value!.post,
      setState: (post) => state = AsyncData(state.value!.copyWith(post: post)),
      optimisticUpdate: (post) =>
          post.copyWith(liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1),
      action: () => ref.read(postsRepositoryProvider).toggleLike(current.post.id),
    );
  }

  Future<void> toggleSave() async {
    final current = state.value;
    if (current == null) return;
    await runOptimistic<Post>(
      getCurrent: () => state.value!.post,
      setState: (post) => state = AsyncData(state.value!.copyWith(post: post)),
      optimisticUpdate: (post) => post.copyWith(saved: !post.saved),
      action: () => ref.read(postsRepositoryProvider).toggleSave(current.post.id),
    );
  }

  Future<void> addComment(String content) async {
    final current = state.value;
    if (current == null) return;
    final comment = await ref.read(postsRepositoryProvider).addComment(current.post.id, content);
    state = AsyncData(current.copyWith(
      comments: [...current.comments, comment],
      post: current.post.copyWith(commentsCount: current.post.commentsCount + 1),
    ));
  }

  Future<void> deleteComment(String commentId) async {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(
      comments: current.comments.where((c) => c.id != commentId).toList(),
      post: current.post.copyWith(commentsCount: current.post.commentsCount - 1),
    ));
    try {
      await ref.read(postsRepositoryProvider).deleteComment(current.post.id, commentId);
    } catch (_) {
      state = AsyncData(current);
      rethrow;
    }
  }
}
