import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/network/api_exception.dart';
import '../../../models/post.dart';
import '../../../models/topic.dart';
import '../data/posts_repository.dart';
import '../data/topics_repository.dart';

/// Shows the create-post bottom sheet and returns the created Post, or null
/// if the user cancelled.
Future<Post?> showCreatePostSheet(BuildContext context) {
  return showModalBottomSheet<Post>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => const _CreatePostSheet(),
  );
}

class _CreatePostSheet extends ConsumerStatefulWidget {
  const _CreatePostSheet();

  @override
  ConsumerState<_CreatePostSheet> createState() => _CreatePostSheetState();
}

class _CreatePostSheetState extends ConsumerState<_CreatePostSheet> {
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  final _picker = ImagePicker();

  List<XFile> _images = [];
  Topic? _selectedTopic;
  SubTopic? _selectedSubTopic;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    final remaining = 5 - _images.length;
    if (remaining <= 0) return;
    final picked = await _picker.pickMultiImage(limit: remaining);
    setState(() => _images = [..._images, ...picked].take(5).toList());
  }

  Future<void> _submit() async {
    if (_contentController.text.trim().isEmpty) {
      setState(() => _error = 'Content is required.');
      return;
    }
    if (_selectedTopic == null) {
      setState(() => _error = 'Please select a topic.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final repo = ref.read(postsRepositoryProvider);
      List<String> imageUrls = [];
      if (_images.isNotEmpty) {
        imageUrls = await repo.uploadImages(_images.map((f) => f.path).toList());
      }
      final post = await repo.createPost(
        title: _titleController.text.trim(),
        content: _contentController.text.trim(),
        images: imageUrls,
        topic: _selectedTopic!.name,
        subTopic: _selectedSubTopic?.name,
      );
      if (mounted) Navigator.of(context).pop(post);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Failed to create post.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final topicsAsync = ref.watch(activeTopicsProvider);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: DraggableScrollableSheet(
        initialChildSize: 0.85,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Text('Create Post', style: Theme.of(context).textTheme.titleLarge),
                  const Spacer(),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(context).pop()),
                ],
              ),
              const SizedBox(height: 8),
              if (_error != null) ...[
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                const SizedBox(height: 8),
              ],
              TextField(
                controller: _titleController,
                maxLength: 300,
                decoration: const InputDecoration(labelText: 'Title (optional)'),
              ),
              TextField(
                controller: _contentController,
                maxLines: 4,
                maxLength: 2000,
                decoration: const InputDecoration(labelText: 'What would you like to share?'),
              ),
              const SizedBox(height: 8),
              topicsAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (_, __) => const Text('Failed to load topics'),
                data: (topics) => DropdownButtonFormField<Topic>(
                  value: _selectedTopic,
                  decoration: const InputDecoration(labelText: 'Topic'),
                  items: topics.map((t) => DropdownMenuItem(value: t, child: Text(t.name))).toList(),
                  onChanged: (t) => setState(() {
                    _selectedTopic = t;
                    _selectedSubTopic = null;
                  }),
                ),
              ),
              if (_selectedTopic != null) ...[
                const SizedBox(height: 8),
                Consumer(
                  builder: (context, ref, _) {
                    final subsAsync = ref.watch(subTopicsForProvider(_selectedTopic!.id));
                    return subsAsync.when(
                      loading: () => const LinearProgressIndicator(),
                      error: (_, __) => const SizedBox.shrink(),
                      data: (subs) => DropdownButtonFormField<SubTopic>(
                        value: _selectedSubTopic,
                        decoration: const InputDecoration(labelText: 'Subtopic (optional)'),
                        items: subs.map((s) => DropdownMenuItem(value: s, child: Text(s.name))).toList(),
                        onChanged: (s) => setState(() => _selectedSubTopic = s),
                      ),
                    );
                  },
                ),
              ],
              const SizedBox(height: 12),
              if (_images.isNotEmpty)
                SizedBox(
                  height: 80,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _images.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, i) => Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.file(File(_images[i].path), width: 80, height: 80, fit: BoxFit.cover),
                        ),
                        Positioned(
                          top: 2, right: 2,
                          child: GestureDetector(
                            onTap: () => setState(() => _images = [..._images]..removeAt(i)),
                            child: const CircleAvatar(
                              radius: 10,
                              backgroundColor: Colors.black54,
                              child: Icon(Icons.close, size: 12, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              OutlinedButton.icon(
                onPressed: _images.length >= 5 ? null : _pickImages,
                icon: const Icon(Icons.image_outlined),
                label: Text(_images.isEmpty ? 'Add images (max 5)' : 'Add more (${_images.length}/5)'),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Publish Post'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
