import 'package:flutter/material.dart';

import '../../../models/user.dart';

class ProfileStatsRow extends StatelessWidget {
  const ProfileStatsRow({super.key, required this.stats});

  final UserStats? stats;

  @override
  Widget build(BuildContext context) {
    final s = stats ?? const UserStats();
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _Stat(label: 'Friends', value: '${s.friends}'),
        _Stat(label: 'Posts', value: '${s.posts}'),
        _Stat(label: 'Quizzes', value: '${s.quizzesTaken}'),
        _Stat(label: 'Avg Score', value: '${s.averageScore.toStringAsFixed(0)}%'),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
