import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../models/leaderboard_entry.dart';
import '../../../models/quiz.dart';
import '../../quizzes_browse/data/quiz_repository.dart';

part 'quiz_result_controller.g.dart';

class AnswerReviewItem {
  AnswerReviewItem({
    required this.questionText,
    required this.options,
    required this.userAnswer,
    required this.correctOption,
  });

  final String questionText;
  final List<String> options;
  final int? userAnswer;
  final int correctOption;

  bool get answered => userAnswer != null;
  bool get isCorrect => answered && userAnswer == correctOption;
}

class QuizResultData {
  QuizResultData({
    required this.quiz,
    required this.leaderboard,
    required this.score,
    required this.total,
    required this.rank,
    required this.duration,
    required this.answerReview,
  });

  final Quiz quiz;
  final List<LeaderboardEntry> leaderboard;
  final int score;
  final int total;
  final int? rank;
  final int duration;
  final List<AnswerReviewItem> answerReview;

  double get percentage => total == 0 ? 0 : (score / total) * 100;
}

@riverpod
class QuizResultController extends _$QuizResultController {
  @override
  Future<QuizResultData> build(String quizId) async {
    final repo = ref.read(quizRepositoryProvider);

    final quiz = await repo.getQuiz(quizId);
    final history = await repo.getMyQuizHistory(quizId);
    final questions = await repo.getQuizQuestions(quizId);

    final leaderboard = ((history['leaderboard'] as List?) ?? [])
        .map((e) => LeaderboardEntry.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();

    final rawAnswers = (history['answers'] as List?) ?? [];
    final answersByQuestionId = <String, int>{
      for (final a in rawAnswers)
        (a as Map)['questionId']?.toString() ?? '': (a['answer'] as num?)?.toInt() ?? -1,
    };

    final review = <AnswerReviewItem>[
      for (final q in questions)
        AnswerReviewItem(
          questionText: q['text']?.toString() ?? '',
          options: ((q['options'] as List?) ?? [])
              .map((o) => o is Map ? (o['text']?.toString() ?? '') : o.toString())
              .toList(),
          userAnswer: answersByQuestionId[q['_id']?.toString() ?? q['id']?.toString() ?? ''],
          correctOption: (q['correctOption'] as num?)?.toInt() ?? -1,
        ),
    ];

    return QuizResultData(
      quiz: quiz,
      leaderboard: leaderboard,
      score: (history['score'] as num?)?.toInt() ?? 0,
      total: (history['total'] as num?)?.toInt() ?? questions.length,
      rank: (history['rank'] as num?)?.toInt(),
      duration: (history['duration'] as num?)?.toInt() ?? 0,
      answerReview: review,
    );
  }
}
