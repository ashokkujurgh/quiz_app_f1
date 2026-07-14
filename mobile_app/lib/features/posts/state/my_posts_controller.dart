import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../models/post.dart';
import '../../auth/state/auth_controller.dart';
import '../../home_feed/data/posts_repository.dart';

part 'my_posts_controller.g.dart';

@riverpod
class MyPostsController extends _$MyPostsController {
  @override
  Future<List<Post>> build() async {
    final user = ref.watch(authControllerProvider).valueOrNull;
    if (user == null) return [];
    final result = await ref.read(postsRepositoryProvider).getUserPosts(user.id);
    return result.posts;
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  Future<void> deletePost(String id) async {
    final current = state.value ?? [];
    state = AsyncData(current.where((p) => p.id != id).toList());
    try {
      await ref.read(postsRepositoryProvider).deletePost(id);
    } catch (_) {
      state = AsyncData(current);
      rethrow;
    }
  }

  void updateInList(Post updated) {
    final current = state.value ?? [];
    state = AsyncData(current.map((p) => p.id == updated.id ? updated : p).toList());
  }
}
