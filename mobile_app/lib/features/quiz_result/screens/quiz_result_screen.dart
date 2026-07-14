import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../state/quiz_result_controller.dart';
import '../widgets/answer_review_tile.dart';
import '../widgets/share_to_feed_button.dart';

class QuizResultScreen extends ConsumerWidget {
  const QuizResultScreen({super.key, required this.quizId});

  final String quizId;

  static const _medals = ['🥇', '🥈', '🥉'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resultAsync = ref.watch(quizResultControllerProvider(quizId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Results'),
        automaticallyImplyLeading: false,
        actions: [
          TextButton(onPressed: () => context.go(RoutePaths.home), child: const Text('Done')),
        ],
      ),
      body: resultAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load results: $err')),
        data: (result) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Text(result.quiz.title, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    Text(
                      '${result.score} / ${result.total}',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    Text('${result.percentage.toStringAsFixed(0)}%'),
                    if (result.rank != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        result.rank! <= 3 ? '${_medals[result.rank! - 1]} Rank #${result.rank}' : 'Rank #${result.rank}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ],
                    const SizedBox(height: 16),
                    ShareToFeedButton(result: result),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (result.leaderboard.isNotEmpty) ...[
              Text('Leaderboard', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Card(
                child: Column(
                  children: [
                    for (final entry in result.leaderboard.take(10))
                      ListTile(
                        leading: Text(entry.rank <= 3 ? _medals[entry.rank - 1] : '${entry.rank}'),
                        title: Text(entry.userName),
                        trailing: Text('${entry.score}/${entry.total}'),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
            Text('Answer Review', style: Theme.of(context).textTheme.titleMedium),
            for (var i = 0; i < result.answerReview.length; i++)
              AnswerReviewTile(index: i, item: result.answerReview[i]),
          ],
        ),
      ),
    );
  }
}
