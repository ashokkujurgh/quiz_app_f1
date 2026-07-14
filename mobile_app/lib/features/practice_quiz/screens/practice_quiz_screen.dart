import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../quiz_play/widgets/question_card.dart';
import '../../quiz_play/state/quiz_play_state.dart' show LiveQuestion;
import '../state/practice_quiz_controller.dart';

class PracticeQuizScreen extends ConsumerWidget {
  const PracticeQuizScreen({super.key, required this.args});

  final PracticeQuizArgs args;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stateAsync = ref.watch(practiceQuizControllerProvider(args.subTopicId));
    final notifier = ref.read(practiceQuizControllerProvider(args.subTopicId).notifier);

    return Scaffold(
      appBar: AppBar(title: Text('Practice: ${args.subTopicName}')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load questions: $err')),
        data: (state) {
          if (state.questions.isEmpty) {
            return const Center(child: Text('No questions available for this topic yet.'));
          }
          if (state.completed) {
            return _PracticeSummary(state: state);
          }

          final question = state.questions[state.currentIndex];
          final liveQuestion = LiveQuestion(
            questionIndex: state.currentIndex,
            questionId: question.id,
            question: question.text,
            options: question.options.map((o) => o.text).toList(),
            timeLimit: 0,
            total: state.questions.length,
          );

          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                LinearProgressIndicator(value: (state.currentIndex + 1) / state.questions.length),
                const SizedBox(height: 16),
                Expanded(
                  child: SingleChildScrollView(
                    child: QuestionCard(
                      question: liveQuestion,
                      selectedOption: state.answers[state.currentIndex],
                      correctOption: null,
                      onSelect: notifier.selectAnswer,
                    ),
                  ),
                ),
                Row(
                  children: [
                    OutlinedButton(
                      onPressed: state.currentIndex > 0 ? notifier.previous : null,
                      child: const Text('Previous'),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: state.answers.containsKey(state.currentIndex) ? notifier.next : null,
                        child: Text(state.currentIndex == state.questions.length - 1 ? 'Finish' : 'Next'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _PracticeSummary extends StatelessWidget {
  const _PracticeSummary({required this.state});
  final PracticeQuizState state;

  @override
  Widget build(BuildContext context) {
    final total = state.questions.length;
    final score = state.score;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.emoji_events_outlined, size: 56, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 16),
            Text('$score / $total', style: Theme.of(context).textTheme.headlineMedium),
            Text('${(score / total * 100).toStringAsFixed(0)}%'),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: () => context.pop(), child: const Text('Done')),
          ],
        ),
      ),
    );
  }
}
