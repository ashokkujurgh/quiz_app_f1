import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../models/quiz.dart';
import '../data/quiz_repository.dart';

part 'quizzes_list_controller.g.dart';

enum QuizStatusFilter { all, scheduled, active, completed }

class QuizzesListState {
  QuizzesListState({required this.quizzes, required this.statusFilter, this.searchQuery = ''});

  final List<Quiz> quizzes;
  final QuizStatusFilter statusFilter;
  final String searchQuery;

  List<Quiz> get filtered {
    var list = quizzes;
    if (searchQuery.isNotEmpty) {
      final q = searchQuery.toLowerCase();
      list = list.where((quiz) => quiz.title.toLowerCase().contains(q)).toList();
    }
    return list;
  }

  QuizzesListState copyWith({List<Quiz>? quizzes, QuizStatusFilter? statusFilter, String? searchQuery}) {
    return QuizzesListState(
      quizzes: quizzes ?? this.quizzes,
      statusFilter: statusFilter ?? this.statusFilter,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

@riverpod
class QuizzesListController extends _$QuizzesListController {
  @override
  Future<QuizzesListState> build() async {
    return _fetch(QuizStatusFilter.all);
  }

  Future<QuizzesListState> _fetch(QuizStatusFilter filter) async {
    final repo = ref.read(quizRepositoryProvider);
    final quizzes = switch (filter) {
      QuizStatusFilter.all => await repo.getQuizzes(),
      QuizStatusFilter.scheduled => await repo.getQuizzes(status: 'scheduled'),
      QuizStatusFilter.active => await repo.getActiveQuizzes(),
      QuizStatusFilter.completed => await repo.getCompletedQuizzes(),
    };
    return QuizzesListState(quizzes: quizzes, statusFilter: filter);
  }

  Future<void> setStatusFilter(QuizStatusFilter filter) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetch(filter));
  }

  void setSearchQuery(String query) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(searchQuery: query));
  }

  Future<void> refresh() async {
    final filter = state.value?.statusFilter ?? QuizStatusFilter.all;
    state = await AsyncValue.guard(() => _fetch(filter));
  }
}
