import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../messages/state/conversations_controller.dart';
import '../state/friends_controller.dart';
import '../widgets/friend_card.dart';

class FriendsScreen extends ConsumerStatefulWidget {
  const FriendsScreen({super.key});

  @override
  ConsumerState<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends ConsumerState<FriendsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final stateAsync = ref.watch(friendsControllerProvider);
    final notifier = ref.read(friendsControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Friends'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Friends'),
            Tab(text: 'Incoming'),
            Tab(text: 'Sent'),
            Tab(text: 'Suggestions'),
          ],
        ),
      ),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load friends: $err')),
        data: (state) => RefreshIndicator(
          onRefresh: notifier.refresh,
          child: TabBarView(
            controller: _tabController,
            children: [
              _FriendsListTab(
                items: state.friends,
                emptyText: 'No friends yet.',
                itemBuilder: (user) => FriendCard(
                  user: user,
                  onTap: () => context.push(RoutePaths.userProfile.replaceFirst(':userId', user.id)),
                  trailing: Wrap(
                    spacing: 4,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.chat_bubble_outline),
                        onPressed: () async {
                          final conv = await ref
                              .read(conversationsControllerProvider.notifier)
                              .openConversation(user.id);
                          if (context.mounted) context.push('/messages/${conv.id}');
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.person_remove_outlined),
                        onPressed: state.busyIds.contains(user.id) ? null : () => notifier.unfriend(user),
                      ),
                    ],
                  ),
                ),
              ),
              _FriendsListTab(
                items: state.incoming,
                emptyText: 'No incoming requests.',
                itemBuilder: (req) => FriendCard(
                  user: req.user,
                  trailing: Wrap(
                    spacing: 4,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.check_circle_outline, color: Colors.green),
                        onPressed: state.busyIds.contains(req.requestId) ? null : () => notifier.acceptRequest(req),
                      ),
                      IconButton(
                        icon: const Icon(Icons.cancel_outlined),
                        onPressed: state.busyIds.contains(req.requestId) ? null : () => notifier.declineRequest(req),
                      ),
                    ],
                  ),
                ),
              ),
              _FriendsListTab(
                items: state.outgoing,
                emptyText: 'No sent requests.',
                itemBuilder: (req) => FriendCard(
                  user: req.user,
                  subtitle: 'Request pending',
                  trailing: TextButton(
                    onPressed: state.busyIds.contains(req.user.id) ? null : () => notifier.cancelRequest(req),
                    child: const Text('Cancel'),
                  ),
                ),
              ),
              _FriendsListTab(
                items: state.suggestions,
                emptyText: 'No suggestions right now.',
                itemBuilder: (user) => FriendCard(
                  user: user,
                  trailing: OutlinedButton(
                    onPressed: state.busyIds.contains(user.id) ? null : () => notifier.sendRequest(user),
                    child: const Text('Add'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FriendsListTab<T> extends StatelessWidget {
  const _FriendsListTab({required this.items, required this.emptyText, required this.itemBuilder});

  final List<T> items;
  final String emptyText;
  final Widget Function(T) itemBuilder;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return ListView(
        children: [
          Padding(
            padding: const EdgeInsets.all(48),
            child: Center(child: Text(emptyText)),
          ),
        ],
      );
    }
    return ListView.builder(
      itemCount: items.length,
      itemBuilder: (context, index) => itemBuilder(items[index]),
    );
  }
}
