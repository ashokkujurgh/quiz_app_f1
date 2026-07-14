import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../auth/state/auth_controller.dart';
import '../../home_feed/widgets/post_card.dart';
import '../state/user_profile_controller.dart';
import '../widgets/profile_stats_row.dart';
import '../widgets/relationship_action_button.dart';

class UserProfileScreen extends ConsumerWidget {
  const UserProfileScreen({super.key, required this.userId});

  final String userId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final myId = ref.watch(authControllerProvider).valueOrNull?.id;
    if (myId == userId) {
      // Viewing your own profile via a shared link — redirect to the richer
      // own-profile screen instead of duplicating it here.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.pushReplacement(RoutePaths.profile);
      });
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final profileAsync = ref.watch(userProfileControllerProvider(userId));

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load profile: $err')),
        data: (data) => ListView(
          children: [
            const SizedBox(height: 16),
            Center(
              child: CircleAvatar(
                radius: 40,
                backgroundImage: data.user.avatar != null ? CachedNetworkImageProvider(data.user.avatar!) : null,
                child: data.user.avatar == null ? Text(data.user.name.characters.first.toUpperCase()) : null,
              ),
            ),
            const SizedBox(height: 12),
            Text(data.user.name, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
            Text('@${data.user.username ?? ''}', style: Theme.of(context).textTheme.bodySmall, textAlign: TextAlign.center),
            if (data.user.bio != null && data.user.bio!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                child: Text(data.user.bio!, textAlign: TextAlign.center),
              ),
            const SizedBox(height: 12),
            ProfileStatsRow(stats: data.user.stats),
            const SizedBox(height: 16),
            Center(child: RelationshipActionButton(user: data.user, status: data.status)),
            const SizedBox(height: 16),
            const Divider(),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text('Posts', style: Theme.of(context).textTheme.titleMedium),
            ),
            if (data.posts.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: Text('No posts yet.')),
              )
            else
              for (final post in data.posts) PostCard(post: post),
          ],
        ),
      ),
    );
  }
}
