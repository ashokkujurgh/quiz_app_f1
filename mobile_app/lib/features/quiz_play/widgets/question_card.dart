import 'package:flutter/material.dart';

import '../state/quiz_play_state.dart';

class QuestionCard extends StatelessWidget {
  const QuestionCard({
    super.key,
    required this.question,
    required this.selectedOption,
    this.correctOption,
    required this.onSelect,
  });

  final LiveQuestion question;
  final int? selectedOption;
  final int? correctOption; // non-null once revealed
  final ValueChanged<int> onSelect;

  static const _optionLetters = ['A', 'B', 'C', 'D'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final revealed = correctOption != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Question ${question.questionIndex + 1}/${question.total}',
          style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        Text(question.question, style: theme.textTheme.titleLarge),
        const SizedBox(height: 20),
        for (var i = 0; i < question.options.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _OptionTile(
              letter: _optionLetters[i],
              text: question.options[i],
              isSelected: selectedOption == i,
              isCorrect: revealed && correctOption == i,
              isWrongSelection: revealed && selectedOption == i && correctOption != i,
              disabled: revealed || selectedOption != null,
              onTap: () => onSelect(i),
            ),
          ),
      ],
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.letter,
    required this.text,
    required this.isSelected,
    required this.isCorrect,
    required this.isWrongSelection,
    required this.disabled,
    required this.onTap,
  });

  final String letter;
  final String text;
  final bool isSelected;
  final bool isCorrect;
  final bool isWrongSelection;
  final bool disabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Color? bg;
    Color? borderColor;
    if (isCorrect) {
      bg = AppSuccessColors.bg;
      borderColor = AppSuccessColors.border;
    } else if (isWrongSelection) {
      bg = theme.colorScheme.error.withValues(alpha: 0.12);
      borderColor = theme.colorScheme.error;
    } else if (isSelected) {
      bg = theme.colorScheme.primary.withValues(alpha: 0.12);
      borderColor = theme.colorScheme.primary;
    }

    return InkWell(
      onTap: disabled ? null : onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: bg,
          border: Border.all(color: borderColor ?? theme.dividerColor),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            CircleAvatar(radius: 12, child: Text(letter, style: const TextStyle(fontSize: 12))),
            const SizedBox(width: 12),
            Expanded(child: Text(text)),
            if (isCorrect) const Icon(Icons.check_circle, color: Colors.green, size: 20),
            if (isWrongSelection) Icon(Icons.cancel, color: theme.colorScheme.error, size: 20),
          ],
        ),
      ),
    );
  }
}

class AppSuccessColors {
  static const bg = Color(0x1F22C55E);
  static const border = Color(0xFF22C55E);
}
