import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../home_feed/data/posts_repository.dart';
import '../state/quiz_result_controller.dart';

class ShareToFeedButton extends ConsumerStatefulWidget {
  const ShareToFeedButton({super.key, required this.result});

  final QuizResultData result;

  @override
  ConsumerState<ShareToFeedButton> createState() => _ShareToFeedButtonState();
}

class _ShareToFeedButtonState extends ConsumerState<ShareToFeedButton> {
  bool _sharing = false;
  bool _shared = false;

  Future<void> _share() async {
    setState(() => _sharing = true);
    try {
      final r = widget.result;
      final medal = r.rank == 1 ? '🥇' : r.rank == 2 ? '🥈' : r.rank == 3 ? '🥉' : '🎯';
      await ref.read(postsRepositoryProvider).createPost(
        content: '$medal Just scored ${r.score}/${r.total} (${r.percentage.toStringAsFixed(0)}%) on '
            '"${r.quiz.title}"${r.rank != null ? ' — ranked #${r.rank}!' : '!'}',
        topic: r.quiz.topic ?? 'General',
        quizResult: {
          'quizId': r.quiz.id,
          'quizTitle': r.quiz.title,
          'score': r.score,
          'total': r.total,
          'percentage': r.percentage,
          'rank': r.rank,
          'duration': r.duration,
        },
      );
      if (mounted) {
        setState(() => _shared = true);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Shared to your feed!')));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to share.')));
      }
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: _sharing || _shared ? null : _share,
      icon: _sharing
          ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
          : Icon(_shared ? Icons.check : Icons.share_outlined),
      label: Text(_shared ? 'Shared' : 'Share to Feed'),
    );
  }
}
