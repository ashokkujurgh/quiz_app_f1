import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../models/question.dart';
import '../../quiz_create/data/question_repository.dart';

part 'practice_quiz_controller.g.dart';

class PracticeQuizArgs {
  PracticeQuizArgs({required this.subTopicId, required this.subTopicName});
  final String subTopicId;
  final String subTopicName;
}

class PracticeQuizState {
  PracticeQuizState({
    required this.questions,
    required this.currentIndex,
    required this.answers,
    this.completed = false,
  });

  final List<Question> questions;
  final int currentIndex;
  final Map<int, int> answers; // questionIndex -> selected option
  final bool completed;

  int get score {
    var s = 0;
    answers.forEach((i, answer) {
      if (questions[i].correctOption == answer) s++;
    });
    return s;
  }

  PracticeQuizState copyWith({int? currentIndex, Map<int, int>? answers, bool? completed}) {
    return PracticeQuizState(
      questions: questions,
      currentIndex: currentIndex ?? this.currentIndex,
      answers: answers ?? this.answers,
      completed: completed ?? this.completed,
    );
  }
}

@riverpod
class PracticeQuizController extends _$PracticeQuizController {
  @override
  Future<PracticeQuizState> build(String subTopicId) async {
    final questions = await ref.read(questionRepositoryProvider).getQuestions(subTopic: subTopicId, limit: 15);
    questions.shuffle();
    return PracticeQuizState(questions: questions, currentIndex: 0, answers: const {});
  }

  void selectAnswer(int optionIndex) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(answers: {...current.answers, current.currentIndex: optionIndex}));
  }

  void next() {
    final current = state.value;
    if (current == null) return;
    if (current.currentIndex < current.questions.length - 1) {
      state = AsyncData(current.copyWith(currentIndex: current.currentIndex + 1));
    } else {
      state = AsyncData(current.copyWith(completed: true));
    }
  }

  void previous() {
    final current = state.value;
    if (current == null || current.currentIndex == 0) return;
    state = AsyncData(current.copyWith(currentIndex: current.currentIndex - 1));
  }
}
