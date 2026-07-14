import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../state/quiz_play_controller.dart';
import '../state/quiz_play_state.dart';
import '../widgets/countdown_ring.dart';
import '../widgets/live_leaderboard_panel.dart';
import '../widgets/question_card.dart';

class QuizPlayScreen extends ConsumerStatefulWidget {
  const QuizPlayScreen({super.key, required this.quizId});

  final String quizId;

  @override
  ConsumerState<QuizPlayScreen> createState() => _QuizPlayScreenState();
}

class _QuizPlayScreenState extends ConsumerState<QuizPlayScreen> {
  @override
  Widget build(BuildContext context) {
    ref.listen(quizPlayControllerProvider(widget.quizId), (previous, next) {
      if (next is QuizPlayEnded) {
        context.pushReplacement(RoutePaths.quizResult.replaceFirst(':quizId', widget.quizId));
      }
    });

    final playState = ref.watch(quizPlayControllerProvider(widget.quizId));

    return Scaffold(
      appBar: AppBar(title: const Text('Live Quiz')),
      body: SafeArea(
        child: switch (playState) {
          QuizPlayConnecting() => const Center(child: CircularProgressIndicator()),
          QuizPlayLobby(:final players) => _LobbyView(players: players),
          QuizPlayPerQuestionRound s => _PerQuestionView(
              question: s.question,
              timeLeft: s.timeLeft,
              selectedOption: s.selectedOption,
              correctOption: null,
              players: s.players,
              liveScores: s.liveScores,
              onSelect: (i) => ref.read(quizPlayControllerProvider(widget.quizId).notifier).selectAnswer(i),
            ),
          QuizPlayPerQuestionEnded s => _PerQuestionView(
              question: s.question,
              timeLeft: 0,
              selectedOption: s.selectedOption,
              correctOption: s.correctOption,
              players: s.players,
              liveScores: s.liveScores,
              onSelect: (_) {},
            ),
          QuizPlayTotalTimerRound s => _TotalTimerView(
              state: s,
              onSelect: (i) => ref.read(quizPlayControllerProvider(widget.quizId).notifier).selectAnswer(i),
              onNext: () => ref.read(quizPlayControllerProvider(widget.quizId).notifier).nextQuestion(),
              onPrev: () => ref.read(quizPlayControllerProvider(widget.quizId).notifier).prevQuestion(),
            ),
          QuizPlayEnded() => const Center(child: CircularProgressIndicator()),
          QuizPlayAlreadyAttempted(:final message) => _MessageView(
              icon: Icons.block,
              message: message ?? "You've already played this quiz.",
            ),
          QuizPlayError(:final message) => _MessageView(icon: Icons.error_outline, message: message),
        },
      ),
    );
  }
}

class _LobbyView extends StatelessWidget {
  const _LobbyView({required this.players});
  final List<QuizPlayer> players;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text('Waiting for the quiz to start…', style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 8),
          Text('${players.length} player(s) joined', style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _PerQuestionView extends StatelessWidget {
  const _PerQuestionView({
    required this.question,
    required this.timeLeft,
    required this.selectedOption,
    required this.correctOption,
    required this.players,
    required this.liveScores,
    required this.onSelect,
  });

  final LiveQuestion question;
  final int timeLeft;
  final int? selectedOption;
  final int? correctOption;
  final List<QuizPlayer> players;
  final List<dynamic> liveScores;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 700;
    final content = Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: CountdownRing(secondsLeft: timeLeft, totalSeconds: question.timeLimit == 0 ? 1 : question.timeLimit),
          ),
          const SizedBox(height: 16),
          QuestionCard(
            question: question,
            selectedOption: selectedOption,
            correctOption: correctOption,
            onSelect: onSelect,
          ),
        ],
      ),
    );

    final leaderboard = LiveLeaderboardPanel(players: players, scores: liveScores.cast());

    if (!isWide) {
      return SingleChildScrollView(child: content);
    }
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(flex: 2, child: SingleChildScrollView(child: content)),
        SizedBox(width: 280, child: Padding(padding: const EdgeInsets.all(16), child: leaderboard)),
      ],
    );
  }
}

class _TotalTimerView extends StatelessWidget {
  const _TotalTimerView({
    required this.state,
    required this.onSelect,
    required this.onNext,
    required this.onPrev,
  });

  final QuizPlayTotalTimerRound state;
  final ValueChanged<int> onSelect;
  final VoidCallback onNext;
  final VoidCallback onPrev;

  @override
  Widget build(BuildContext context) {
    final question = state.questions[state.currentIndex];
    final selected = state.answers[state.currentIndex];

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${state.answers.length}/${state.questions.length} answered'),
              CountdownRing(secondsLeft: state.timeLeft, totalSeconds: state.timeLeft == 0 ? 1 : state.timeLeft),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: SingleChildScrollView(
              child: QuestionCard(
                question: question,
                selectedOption: selected,
                correctOption: null,
                onSelect: onSelect,
              ),
            ),
          ),
          Row(
            children: [
              OutlinedButton(
                onPressed: state.currentIndex > 0 ? onPrev : null,
                child: const Text('Previous'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: state.currentIndex < state.questions.length - 1 ? onNext : null,
                  child: const Text('Next'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MessageView extends StatelessWidget {
  const _MessageView({required this.icon, required this.message});
  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 16),
            Text(message, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
