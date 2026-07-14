import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../models/post.dart';
import '../../../models/user.dart';
import '../../friends/data/friends_repository.dart';
import '../../home_feed/data/posts_repository.dart';
import '../data/profile_repository.dart';

part 'user_profile_controller.g.dart';

class UserProfileData {
  UserProfileData({required this.user, required this.status, required this.posts});
  final User user;
  final FriendshipStatus status;
  final List<Post> posts;
}

/// Public profile view of an arbitrary user — family(userId). Note: there's
/// no backend endpoint to list another user's friends (GET /api/friends only
/// returns the current user's own list), so unlike ProfileScreen (own
/// profile) this has no Friends tab.
@riverpod
class UserProfileController extends _$UserProfileController {
  @override
  Future<UserProfileData> build(String userId) async {
    final userFuture = ref.read(profileRepositoryProvider).getUser(userId);
    final statusFuture = ref.read(friendsRepositoryProvider).getStatus(userId);
    final postsFuture = ref.read(postsRepositoryProvider).getUserPosts(userId);

    final user = await userFuture;
    final status = await statusFuture;
    final posts = await postsFuture;

    return UserProfileData(user: user, status: status, posts: posts.posts);
  }
}
