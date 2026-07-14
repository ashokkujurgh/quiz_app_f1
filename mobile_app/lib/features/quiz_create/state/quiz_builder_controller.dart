import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../models/quiz.dart';
import '../../../models/user.dart';
import '../../quizzes_browse/data/quiz_repository.dart';

part 'quiz_builder_controller.g.dart';

class QuizBuilderForm {
  QuizBuilderForm({
    this.title = '',
    this.description = '',
    this.questionCount = 10,
    this.selectionMode = 'random',
    this.topicId,
    this.subTopicId,
    this.scheduledAt,
    this.durationMinutes = 30,
    this.timeLimitPerQuestion,
    this.participation = 'public',
    this.allowedUsers = const [],
    this.selectedQuestionIds = const [],
  });

  final String title;
  final String description;
  final int questionCount;
  final String selectionMode; // 'manual' | 'random'
  final String? topicId;
  final String? subTopicId;
  final DateTime? scheduledAt;
  final int durationMinutes;
  final int? timeLimitPerQuestion;
  final String participation; // 'public' | 'private' | 'invite_only'
  final List<User> allowedUsers;
  final List<String> selectedQuestionIds;

  QuizBuilderForm copyWith({
    String? title,
    String? description,
    int? questionCount,
    String? selectionMode,
    String? topicId,
    String? subTopicId,
    DateTime? scheduledAt,
    int? durationMinutes,
    int? timeLimitPerQuestion,
    String? participation,
    List<User>? allowedUsers,
    List<String>? selectedQuestionIds,
  }) {
    return QuizBuilderForm(
      title: title ?? this.title,
      description: description ?? this.description,
      questionCount: questionCount ?? this.questionCount,
      selectionMode: selectionMode ?? this.selectionMode,
      topicId: topicId ?? this.topicId,
      subTopicId: subTopicId ?? this.subTopicId,
      scheduledAt: scheduledAt ?? this.scheduledAt,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      timeLimitPerQuestion: timeLimitPerQuestion ?? this.timeLimitPerQuestion,
      participation: participation ?? this.participation,
      allowedUsers: allowedUsers ?? this.allowedUsers,
      selectedQuestionIds: selectedQuestionIds ?? this.selectedQuestionIds,
    );
  }
}

@riverpod
class QuizBuilderController extends _$QuizBuilderController {
  @override
  QuizBuilderForm build() => QuizBuilderForm();

  void update(QuizBuilderForm Function(QuizBuilderForm) updater) {
    state = updater(state);
  }

  Future<Quiz> submit() async {
    final form = state;
    final body = {
      'title': form.title,
      'description': form.description,
      'questionCount': form.questionCount,
      'selectionMode': form.selectionMode,
      if (form.topicId != null) 'topic': form.topicId,
      if (form.subTopicId != null) 'subTopic': form.subTopicId,
      'scheduledAt': form.scheduledAt?.toIso8601String(),
      'durationMinutes': form.durationMinutes,
      'timeLimitPerQuestion': form.timeLimitPerQuestion,
      'participation': form.participation,
      if (form.participation != 'public') 'allowedUsers': form.allowedUsers.map((u) => u.id).toList(),
    };
    final quiz = await ref.read(quizRepositoryProvider).createQuiz(body);

    if (form.selectionMode == 'manual' && form.selectedQuestionIds.isNotEmpty) {
      await ref.read(quizRepositoryProvider).addQuestionsToQuiz(quiz.id, form.selectedQuestionIds);
    }
    return quiz;
  }
}
