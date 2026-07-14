import 'package:flutter/material.dart';

import '../../../models/leaderboard_entry.dart';
import '../state/quiz_play_state.dart';

class LiveLeaderboardPanel extends StatelessWidget {
  const LiveLeaderboardPanel({super.key, required this.players, required this.scores});

  final List<QuizPlayer> players;
  final List<LeaderboardEntry> scores;

  static const _medals = ['🥇', '🥈', '🥉'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final top = scores.take(10).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.leaderboard_outlined, size: 18),
                const SizedBox(width: 6),
                Text('Leaderboard', style: theme.textTheme.titleMedium),
                const Spacer(),
                Chip(
                  label: Text('${players.length}'),
                  avatar: const Icon(Icons.people, size: 14),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            const Divider(),
            if (top.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text('Scores will appear once players start answering.'),
              )
            else
              for (var i = 0; i < top.length; i++)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      SizedBox(width: 28, child: Text(i < 3 ? _medals[i] : '${i + 1}')),
                      Expanded(child: Text(top[i].userName, overflow: TextOverflow.ellipsis)),
                      Text('${top[i].score}', style: const TextStyle(fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
          ],
        ),
      ),
    );
  }
}
