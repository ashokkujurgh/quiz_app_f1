import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../models/topic.dart';
import '../../home_feed/data/topics_repository.dart';
import '../state/quiz_builder_controller.dart';
import '../widgets/participant_autocomplete.dart';
import '../widgets/question_builder_form.dart';

class CreateQuizScreen extends ConsumerStatefulWidget {
  const CreateQuizScreen({super.key});

  @override
  ConsumerState<CreateQuizScreen> createState() => _CreateQuizScreenState();
}

class _CreateQuizScreenState extends ConsumerState<CreateQuizScreen> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final form = ref.read(quizBuilderControllerProvider);
    if (_titleController.text.trim().isEmpty) {
      setState(() => _error = 'Title is required.');
      return;
    }
    if (form.scheduledAt == null) {
      setState(() => _error = 'Please pick a schedule date/time.');
      return;
    }
    ref.read(quizBuilderControllerProvider.notifier).update(
          (f) => f.copyWith(title: _titleController.text.trim(), description: _descriptionController.text.trim()),
        );

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(quizBuilderControllerProvider.notifier).submit();
      if (mounted) context.pop();
    } catch (e) {
      setState(() => _error = 'Failed to create quiz: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _pickSchedule() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(hours: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.now());
    if (time == null) return;
    final scheduled = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    ref.read(quizBuilderControllerProvider.notifier).update((f) => f.copyWith(scheduledAt: scheduled));
  }

  @override
  Widget build(BuildContext context) {
    final form = ref.watch(quizBuilderControllerProvider);
    final topicsAsync = ref.watch(activeTopicsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Create Quiz')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_error != null) ...[
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            const SizedBox(height: 12),
          ],
          TextField(controller: _titleController, decoration: const InputDecoration(labelText: 'Title')),
          const SizedBox(height: 12),
          TextField(
            controller: _descriptionController,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Description'),
          ),
          const SizedBox(height: 12),
          topicsAsync.when(
            loading: () => const LinearProgressIndicator(),
            error: (_, __) => const Text('Failed to load topics'),
            data: (topics) => DropdownButtonFormField<Topic>(
              decoration: const InputDecoration(labelText: 'Topic'),
              items: topics.map((t) => DropdownMenuItem(value: t, child: Text(t.name))).toList(),
              onChanged: (t) => ref.read(quizBuilderControllerProvider.notifier).update((f) => f.copyWith(topicId: t?.id)),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: form.selectionMode,
                  decoration: const InputDecoration(labelText: 'Question source'),
                  items: const [
                    DropdownMenuItem(value: 'random', child: Text('Random from topic')),
                    DropdownMenuItem(value: 'manual', child: Text('Hand-pick questions')),
                  ],
                  onChanged: (v) => ref.read(quizBuilderControllerProvider.notifier).update((f) => f.copyWith(selectionMode: v)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  initialValue: '${form.questionCount}',
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Question count'),
                  onChanged: (v) => ref
                      .read(quizBuilderControllerProvider.notifier)
                      .update((f) => f.copyWith(questionCount: int.tryParse(v) ?? f.questionCount)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (form.selectionMode == 'manual')
            QuestionBuilderForm(
              topicId: form.topicId,
              selectedIds: form.selectedQuestionIds,
              onChanged: (ids) => ref.read(quizBuilderControllerProvider.notifier).update((f) => f.copyWith(selectedQuestionIds: ids)),
            ),
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(form.scheduledAt == null ? 'Pick schedule date/time' : 'Starts: ${form.scheduledAt}'),
            trailing: const Icon(Icons.calendar_today_outlined),
            onTap: _pickSchedule,
          ),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  initialValue: '${form.durationMinutes}',
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Duration (minutes)'),
                  onChanged: (v) => ref
                      .read(quizBuilderControllerProvider.notifier)
                      .update((f) => f.copyWith(durationMinutes: int.tryParse(v) ?? f.durationMinutes)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  decoration: const InputDecoration(labelText: 'Sec/question (blank = none)'),
                  keyboardType: TextInputType.number,
                  onChanged: (v) => ref
                      .read(quizBuilderControllerProvider.notifier)
                      .update((f) => f.copyWith(timeLimitPerQuestion: int.tryParse(v))),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: form.participation,
            decoration: const InputDecoration(labelText: 'Participation'),
            items: const [
              DropdownMenuItem(value: 'public', child: Text('Public')),
              DropdownMenuItem(value: 'private', child: Text('Private')),
              DropdownMenuItem(value: 'invite_only', child: Text('Invite only')),
            ],
            onChanged: (v) => ref.read(quizBuilderControllerProvider.notifier).update((f) => f.copyWith(participation: v)),
          ),
          if (form.participation != 'public') ...[
            const SizedBox(height: 12),
            ParticipantAutocomplete(
              selected: form.allowedUsers,
              onChanged: (users) => ref.read(quizBuilderControllerProvider.notifier).update((f) => f.copyWith(allowedUsers: users)),
            ),
          ],
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Publish Quiz'),
          ),
        ],
      ),
    );
  }
}
