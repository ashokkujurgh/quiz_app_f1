import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../../models/quiz.dart';
import '../../../models/topic.dart';
import '../../../models/user.dart';
import '../../auth/state/auth_controller.dart';
import '../../home_feed/data/topics_repository.dart';
import '../../practice_quiz/state/practice_quiz_controller.dart';
import '../state/quizzes_list_controller.dart';
import '../widgets/quiz_card.dart';
import '../widgets/quiz_filters_bar.dart';

class QuizzesScreen extends ConsumerStatefulWidget {
  const QuizzesScreen({super.key});

  @override
  ConsumerState<QuizzesScreen> createState() => _QuizzesScreenState();
}

class _QuizzesScreenState extends ConsumerState<QuizzesScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _openPracticePicker() async {
    final topics = await ref.read(topicsRepositoryProvider).getTopics();
    if (!mounted) return;
    final topic = await showModalBottomSheet<Topic>(
      context: context,
      builder: (context) => ListView(
        shrinkWrap: true,
        children: [
          for (final t in topics.where((t) => t.isActive))
            ListTile(title: Text(t.name), onTap: () => Navigator.pop(context, t)),
        ],
      ),
    );
    if (topic == null || !mounted) return;
    final subs = await ref.read(topicsRepositoryProvider).getSubTopics(topic.id);
    if (!mounted) return;
    final subTopic = await showModalBottomSheet(
      context: context,
      builder: (context) => ListView(
        shrinkWrap: true,
        children: [
          for (final s in subs.where((s) => s.isActive))
            ListTile(title: Text(s.name), onTap: () => Navigator.pop(context, s)),
        ],
      ),
    );
    if (subTopic == null || !mounted) return;
    context.push(
      RoutePaths.practiceQuiz,
      extra: PracticeQuizArgs(subTopicId: subTopic.id, subTopicName: subTopic.name),
    );
  }

  @override
  Widget build(BuildContext context) {
    final listAsync = ref.watch(quizzesListControllerProvider);
    final isAdmin = ref.watch(authControllerProvider).valueOrNull?.isAdmin ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Quizzes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.school_outlined),
            tooltip: 'Practice',
            onPressed: _openPracticePicker,
          ),
          if (isAdmin)
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              tooltip: 'Create Quiz',
              onPressed: () => context.push(RoutePaths.quizCreate),
            ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: 'Search quizzes…',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
              onChanged: (value) => ref.read(quizzesListControllerProvider.notifier).setSearchQuery(value),
            ),
          ),
        ),
      ),
      body: listAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load quizzes: $err')),
        data: (list) => RefreshIndicator(
          onRefresh: () => ref.read(quizzesListControllerProvider.notifier).refresh(),
          child: ListView(
            children: [
              const SizedBox(height: 4),
              QuizFiltersBar(
                selected: list.statusFilter,
                onSelected: (filter) => ref.read(quizzesListControllerProvider.notifier).setStatusFilter(filter),
              ),
              const SizedBox(height: 8),
              if (list.filtered.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(48),
                  child: Center(child: Text('No quizzes found.')),
                )
              else
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.72,
                  ),
                  itemCount: list.filtered.length,
                  itemBuilder: (context, index) {
                    final quiz = list.filtered[index];
                    return QuizCard(
                      quiz: quiz,
                      onTap: () {
                        if (quiz.isCompleted) {
                          context.push(RoutePaths.quizResult.replaceFirst(':quizId', quiz.id));
                        } else {
                          context.push(RoutePaths.quizPlay.replaceFirst(':quizId', quiz.id));
                        }
                      },
                    );
                  },
                ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
