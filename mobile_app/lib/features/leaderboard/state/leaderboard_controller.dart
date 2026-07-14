import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../models/leaderboard_entry.dart';
import '../../quizzes_browse/data/quiz_repository.dart';

part 'leaderboard_controller.g.dart';

/// Reuses QuizRepository (already covers /api/quizzes/leaderboard/*) rather
/// than a separate repository — there's no additional leaderboard-specific
/// REST surface to wrap.
@riverpod
Future<List<LeaderboardEntry>> globalLeaderboard(Ref ref) {
  return ref.watch(quizRepositoryProvider).getGlobalLeaderboard();
}

@riverpod
Future<List<LeaderboardEntry>> quizLeaderboard(Ref ref, String quizId) {
  return ref.watch(quizRepositoryProvider).getQuizLeaderboard(quizId);
}
