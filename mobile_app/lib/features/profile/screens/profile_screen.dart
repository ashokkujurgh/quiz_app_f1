import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../auth/state/auth_controller.dart';
import '../../friends/state/friends_controller.dart';
import '../../friends/widgets/friend_card.dart';
import '../../history/state/history_controller.dart';
import '../../home_feed/widgets/post_card.dart';
import '../../posts/state/my_posts_controller.dart';
import '../widgets/profile_stats_row.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).valueOrNull;
    if (user == null) return const SizedBox.shrink();

    final postsAsync = ref.watch(myPostsControllerProvider);
    final historyAsync = ref.watch(historyControllerProvider);
    final friendsAsync = ref.watch(friendsControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.leaderboard_outlined),
            tooltip: 'Leaderboard',
            onPressed: () => context.push(RoutePaths.leaderboard),
          ),
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'History',
            onPressed: () => context.push(RoutePaths.history),
          ),
          IconButton(icon: const Icon(Icons.settings_outlined), onPressed: () => context.push(RoutePaths.settings)),
        ],
      ),
      body: Column(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                height: 100,
                width: double.infinity,
                decoration: BoxDecoration(
                  image: user.coverImage != null
                      ? DecorationImage(image: CachedNetworkImageProvider(user.coverImage!), fit: BoxFit.cover)
                      : null,
                  gradient: user.coverImage == null
                      ? LinearGradient(colors: [Theme.of(context).colorScheme.primary, Theme.of(context).colorScheme.secondary])
                      : null,
                ),
              ),
              Positioned(
                bottom: -32,
                left: 16,
                child: CircleAvatar(
                  radius: 36,
                  backgroundColor: Theme.of(context).scaffoldBackgroundColor,
                  child: CircleAvatar(
                    radius: 32,
                    backgroundImage: user.avatar != null ? CachedNetworkImageProvider(user.avatar!) : null,
                    child: user.avatar == null ? Text(user.name.characters.first.toUpperCase()) : null,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 40),
          Text(user.name, style: Theme.of(context).textTheme.titleLarge),
          Text('@${user.username ?? ''}', style: Theme.of(context).textTheme.bodySmall),
          if (user.bio != null && user.bio!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
              child: Text(user.bio!, textAlign: TextAlign.center),
            ),
          const SizedBox(height: 12),
          ProfileStatsRow(stats: user.stats),
          const SizedBox(height: 12),
          TabBar(
            controller: _tabController,
            tabs: const [Tab(text: 'Posts'), Tab(text: 'Quiz Results'), Tab(text: 'Friends')],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                postsAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, _) => Center(child: Text('Failed to load posts: $err')),
                  data: (posts) => posts.isEmpty
                      ? const Center(child: Text("You haven't posted anything yet."))
                      : ListView(children: [for (final p in posts) PostCard(post: p)]),
                ),
                historyAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, _) => Center(child: Text('Failed to load history: $err')),
                  data: (entries) => entries.isEmpty
                      ? const Center(child: Text('No quiz results yet.'))
                      : ListView.builder(
                          itemCount: entries.length,
                          itemBuilder: (context, index) {
                            final e = entries[index];
                            return ListTile(
                              title: Text(e.quiz.title),
                              trailing: Text('${e.score}/${e.total}'),
                            );
                          },
                        ),
                ),
                friendsAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, _) => Center(child: Text('Failed to load friends: $err')),
                  data: (state) => state.friends.isEmpty
                      ? const Center(child: Text('No friends yet.'))
                      : ListView.builder(
                          itemCount: state.friends.length,
                          itemBuilder: (context, index) => FriendCard(
                            user: state.friends[index],
                            onTap: () => context
                                .push(RoutePaths.userProfile.replaceFirst(':userId', state.friends[index].id)),
                          ),
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
