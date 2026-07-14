import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/question.dart';
import '../data/question_repository.dart';

/// Search-and-pick UI for manual-mode quiz building — lets the admin search
/// the existing question bank rather than authoring new questions inline
/// (question authoring itself is a separate admin surface on the web app).
class QuestionBuilderForm extends ConsumerStatefulWidget {
  const QuestionBuilderForm({
    super.key,
    required this.topicId,
    required this.selectedIds,
    required this.onChanged,
  });

  final String? topicId;
  final List<String> selectedIds;
  final ValueChanged<List<String>> onChanged;

  @override
  ConsumerState<QuestionBuilderForm> createState() => _QuestionBuilderFormState();
}

class _QuestionBuilderFormState extends ConsumerState<QuestionBuilderForm> {
  final _searchController = TextEditingController();
  List<Question> _results = [];
  bool _loading = false;

  Future<void> _search() async {
    setState(() => _loading = true);
    final results = await ref.read(questionRepositoryProvider).getQuestions(
          topic: widget.topicId,
          search: _searchController.text,
          limit: 30,
        );
    if (mounted) {
      setState(() {
        _results = results;
        _loading = false;
      });
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _search());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Selected: ${widget.selectedIds.length} question(s)', style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _searchController,
                decoration: const InputDecoration(labelText: 'Search question bank'),
                onSubmitted: (_) => _search(),
              ),
            ),
            IconButton(icon: const Icon(Icons.search), onPressed: _search),
          ],
        ),
        const SizedBox(height: 8),
        if (_loading) const LinearProgressIndicator(),
        for (final q in _results)
          CheckboxListTile(
            dense: true,
            value: widget.selectedIds.contains(q.id),
            title: Text(q.text, maxLines: 2, overflow: TextOverflow.ellipsis),
            onChanged: (checked) {
              final ids = [...widget.selectedIds];
              if (checked == true) {
                ids.add(q.id);
              } else {
                ids.remove(q.id);
              }
              widget.onChanged(ids);
            },
          ),
      ],
    );
  }
}
