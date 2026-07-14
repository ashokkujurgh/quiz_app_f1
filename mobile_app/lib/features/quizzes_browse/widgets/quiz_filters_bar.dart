import 'package:flutter/material.dart';

import '../state/quizzes_list_controller.dart';

class QuizFiltersBar extends StatelessWidget {
  const QuizFiltersBar({super.key, required this.selected, required this.onSelected});

  final QuizStatusFilter selected;
  final ValueChanged<QuizStatusFilter> onSelected;

  static const _labels = {
    QuizStatusFilter.all: 'All',
    QuizStatusFilter.active: 'Live',
    QuizStatusFilter.scheduled: 'Upcoming',
    QuizStatusFilter.completed: 'Completed',
  };

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        children: [
          for (final filter in QuizStatusFilter.values) ...[
            ChoiceChip(
              label: Text(_labels[filter]!),
              selected: selected == filter,
              onSelected: (_) => onSelected(filter),
            ),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}
