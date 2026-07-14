import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../quiz_result/state/quiz_result_controller.dart';
import '../../quiz_result/widgets/answer_review_tile.dart';
import '../state/history_controller.dart';

class HistoryEntryTile extends ConsumerStatefulWidget {
  const HistoryEntryTile({super.key, required this.entry});

  final HistoryEntry entry;

  @override
  ConsumerState<HistoryEntryTile> createState() => _HistoryEntryTileState();
}

class _HistoryEntryTileState extends ConsumerState<HistoryEntryTile> {
  bool _expanded = false;

  Color _percentageColor(BuildContext context, double percentage) {
    if (percentage >= 80) return Colors.green;
    if (percentage >= 60) return Colors.orange;
    return Theme.of(context).colorScheme.error;
  }

  @override
  Widget build(BuildContext context) {
    final entry = widget.entry;
    final scheduled = DateTime.tryParse(entry.quiz.scheduledAt);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
      child: Column(
        children: [
          ListTile(
            title: Text(entry.quiz.title, maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text(scheduled != null ? '${scheduled.toLocal()}'.split('.').first : ''),
            trailing: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${entry.score}/${entry.total}',
                  style: TextStyle(fontWeight: FontWeight.w700, color: _percentageColor(context, entry.percentage)),
                ),
                if (entry.rank != null) Text('Rank #${entry.rank}', style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
            onTap: () => setState(() => _expanded = !_expanded),
          ),
          if (_expanded)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Consumer(
                builder: (context, ref, _) {
                  final resultAsync = ref.watch(quizResultControllerProvider(entry.quiz.id));
                  return resultAsync.when(
                    loading: () => const Padding(
                      padding: EdgeInsets.all(16),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (err, _) => Text('Failed to load review: $err'),
                    data: (result) => Column(
                      children: [
                        for (var i = 0; i < result.answerReview.length; i++)
                          AnswerReviewTile(index: i, item: result.answerReview[i]),
                      ],
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
