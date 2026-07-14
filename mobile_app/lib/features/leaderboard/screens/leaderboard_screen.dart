import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/state/auth_controller.dart';
import '../state/leaderboard_controller.dart';
import '../widgets/leaderboard_row_tile.dart';

/// Global all-time leaderboard. Note: the backend has no weekly/monthly
/// period filtering (verified against quizController.ts's aggregation
/// pipeline — it's a single all-time GameHistory aggregate), so this only
/// shows what the API actually supports rather than fake period tabs.
class LeaderboardScreen extends ConsumerWidget {
  const LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leaderboardAsync = ref.watch(globalLeaderboardProvider);
    final myUserId = ref.watch(authControllerProvider).valueOrNull?.id;

    return Scaffold(
      appBar: AppBar(title: const Text('Leaderboard')),
      body: leaderboardAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load leaderboard: $err')),
        data: (entries) => entries.isEmpty
            ? const Center(child: Text('No leaderboard data yet.'))
            : RefreshIndicator(
                onRefresh: () => ref.refresh(globalLeaderboardProvider.future),
                child: ListView.builder(
                  itemCount: entries.length,
                  itemBuilder: (context, index) {
                    final entry = entries[index];
                    return LeaderboardRowTile(entry: entry, isCurrentUser: entry.userId == myUserId);
                  },
                ),
              ),
      ),
    );
  }
}
