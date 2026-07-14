import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../models/leaderboard_entry.dart';

class LeaderboardRowTile extends StatelessWidget {
  const LeaderboardRowTile({super.key, required this.entry, this.isCurrentUser = false});

  final LeaderboardEntry entry;
  final bool isCurrentUser;

  static const _medals = ['🥇', '🥈', '🥉'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isGlobal = entry.totalGames != null;

    return Container(
      color: isCurrentUser ? theme.colorScheme.primary.withValues(alpha: 0.08) : null,
      child: ListTile(
        leading: SizedBox(
          width: 32,
          child: Text(
            entry.rank <= 3 ? _medals[entry.rank - 1] : '${entry.rank}',
            style: theme.textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
        ),
        title: Row(
          children: [
            CircleAvatar(
              radius: 14,
              backgroundImage: entry.userAvatar != null ? CachedNetworkImageProvider(entry.userAvatar!) : null,
              child: entry.userAvatar == null ? Text(entry.userName.characters.first.toUpperCase()) : null,
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(entry.userName, overflow: TextOverflow.ellipsis)),
          ],
        ),
        subtitle: isGlobal ? Text('${entry.totalGames} quizzes · ${entry.perfectScores} perfect scores') : null,
        trailing: Text(
          isGlobal ? '${entry.avgPercentage}%' : '${entry.score}/${entry.total}',
          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}
