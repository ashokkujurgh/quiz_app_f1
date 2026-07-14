import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/user.dart';
import '../../auth/data/auth_repository.dart';

class ParticipantAutocomplete extends ConsumerStatefulWidget {
  const ParticipantAutocomplete({super.key, required this.selected, required this.onChanged});

  final List<User> selected;
  final ValueChanged<List<User>> onChanged;

  @override
  ConsumerState<ParticipantAutocomplete> createState() => _ParticipantAutocompleteState();
}

class _ParticipantAutocompleteState extends ConsumerState<ParticipantAutocomplete> {
  final _controller = TextEditingController();
  Timer? _debounce;
  List<User> _results = [];
  bool _loading = false;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () async {
      if (query.trim().length < 2) {
        setState(() => _results = []);
        return;
      }
      setState(() => _loading = true);
      final results = await ref.read(authRepositoryProvider).searchUsers(query);
      if (mounted) {
        setState(() {
          _results = results.where((u) => !widget.selected.any((s) => s.id == u.id)).toList();
          _loading = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.selected.isNotEmpty)
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final user in widget.selected)
                Chip(
                  label: Text(user.name),
                  onDeleted: () => widget.onChanged(widget.selected.where((u) => u.id != user.id).toList()),
                ),
            ],
          ),
        const SizedBox(height: 8),
        TextField(
          controller: _controller,
          decoration: InputDecoration(
            labelText: 'Add participant',
            suffixIcon: _loading ? const Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2)) : null,
          ),
          onChanged: _onChanged,
        ),
        for (final user in _results)
          ListTile(
            dense: true,
            title: Text(user.name),
            subtitle: Text('@${user.username ?? ''}'),
            onTap: () {
              widget.onChanged([...widget.selected, user]);
              _controller.clear();
              setState(() => _results = []);
            },
          ),
      ],
    );
  }
}
