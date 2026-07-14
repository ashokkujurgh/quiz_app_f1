import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../models/quiz.dart';
import '../../quizzes_browse/data/quiz_repository.dart';

part 'history_controller.g.dart';

class HistoryEntry {
  HistoryEntry({required this.quiz, required this.score, required this.total, required this.rank});
  final Quiz quiz;
  final int score;
  final int total;
  final int? rank;

  double get percentage => total == 0 ? 0 : (score / total) * 100;
}

/// Reuses QuizRepository rather than a new repository — every endpoint this
/// needs (/my/history for the quiz list, /:id/my-history for per-quiz
/// score+rank) already exists there.
@riverpod
class HistoryController extends _$HistoryController {
  @override
  Future<List<HistoryEntry>> build() async {
    final repo = ref.read(quizRepositoryProvider);
    final quizzes = await repo.getMyHistoryQuizzes();

    final entries = await Future.wait(quizzes.map((quiz) async {
      final history = await repo.getMyQuizHistory(quiz.id);
      return HistoryEntry(
        quiz: quiz,
        score: (history['score'] as num?)?.toInt() ?? 0,
        total: (history['total'] as num?)?.toInt() ?? 0,
        rank: (history['rank'] as num?)?.toInt(),
      );
    }));

    entries.sort((a, b) => b.quiz.scheduledAt.compareTo(a.quiz.scheduledAt));
    return entries;
  }
}
