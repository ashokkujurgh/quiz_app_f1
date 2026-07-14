import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../state/history_controller.dart';
import '../widgets/history_entry_tile.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final historyAsync = ref.watch(historyControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Quiz History')),
      body: historyAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load history: $err')),
        data: (entries) {
          final total = entries.length;
          final avgScore = total == 0 ? 0.0 : entries.map((e) => e.percentage).reduce((a, b) => a + b) / total;
          final perfectScores = entries.where((e) => e.percentage >= 100).length;
          final filtered = _query.isEmpty
              ? entries
              : entries.where((e) => e.quiz.title.toLowerCase().contains(_query.toLowerCase())).toList();

          return RefreshIndicator(
            onRefresh: () => ref.refresh(historyControllerProvider.future),
            child: ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      _SummaryCard(label: 'Total Quizzes', value: '$total'),
                      const SizedBox(width: 12),
                      _SummaryCard(label: 'Avg Score', value: '${avgScore.toStringAsFixed(0)}%'),
                      const SizedBox(width: 12),
                      _SummaryCard(label: 'Perfect Scores', value: '$perfectScores'),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(hintText: 'Search by quiz title…', prefixIcon: Icon(Icons.search)),
                    onChanged: (v) => setState(() => _query = v),
                  ),
                ),
                const SizedBox(height: 8),
                if (filtered.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(48),
                    child: Center(child: Text('No quiz history yet.')),
                  )
                else
                  for (final entry in filtered) HistoryEntryTile(entry: entry),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            children: [
              Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
              Text(label, style: Theme.of(context).textTheme.bodySmall, textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}
