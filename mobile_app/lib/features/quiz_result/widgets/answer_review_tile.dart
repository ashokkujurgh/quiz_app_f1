import 'package:flutter/material.dart';

import '../state/quiz_result_controller.dart';

class AnswerReviewTile extends StatelessWidget {
  const AnswerReviewTile({super.key, required this.index, required this.item});

  final int index;
  final AnswerReviewItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (icon, color) = !item.answered
        ? (Icons.remove_circle_outline, theme.colorScheme.onSurfaceVariant)
        : item.isCorrect
            ? (Icons.check_circle, Colors.green)
            : (Icons.cancel, theme.colorScheme.error);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text('Q${index + 1}. ${item.questionText}', style: theme.textTheme.bodyMedium)),
              ],
            ),
            const SizedBox(height: 8),
            for (var i = 0; i < item.options.length; i++)
              Padding(
                padding: const EdgeInsets.only(left: 28, bottom: 4),
                child: Row(
                  children: [
                    Icon(
                      i == item.correctOption
                          ? Icons.check_circle
                          : i == item.userAnswer
                              ? Icons.cancel
                              : Icons.circle_outlined,
                      size: 14,
                      color: i == item.correctOption
                          ? Colors.green
                          : i == item.userAnswer
                              ? theme.colorScheme.error
                              : theme.colorScheme.outline,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        item.options[i],
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontWeight: i == item.correctOption ? FontWeight.w700 : FontWeight.normal,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
