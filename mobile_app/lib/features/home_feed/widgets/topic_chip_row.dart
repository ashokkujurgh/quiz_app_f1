import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/topics_repository.dart';

class TopicChipRow extends ConsumerWidget {
  const TopicChipRow({super.key, required this.selected, required this.onSelected});

  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final topicsAsync = ref.watch(activeTopicsProvider);

    return topicsAsync.when(
      loading: () => const SizedBox(height: 40),
      error: (_, __) => const SizedBox.shrink(),
      data: (topics) => SizedBox(
        height: 40,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          itemCount: topics.length + 1,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (context, index) {
            final label = index == 0 ? 'All' : topics[index - 1].name;
            final isSelected = selected == label;
            return ChoiceChip(
              label: Text(label),
              selected: isSelected,
              onSelected: (_) => onSelected(label),
            );
          },
        ),
      ),
    );
  }
}
