import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/routing/route_paths.dart';
import '../state/auth_controller.dart';

/// Reachable via a deep link carrying ?token=... (email verification link).
/// Auto-submits on load, mirroring VerifyEmailPage.tsx.
class VerifyEmailScreen extends ConsumerStatefulWidget {
  const VerifyEmailScreen({super.key, required this.token});

  final String? token;

  @override
  ConsumerState<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

enum _VerifyState { loading, success, error }

class _VerifyEmailScreenState extends ConsumerState<VerifyEmailScreen> {
  _VerifyState _state = _VerifyState.loading;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _verify());
  }

  Future<void> _verify() async {
    if (widget.token == null) {
      setState(() {
        _state = _VerifyState.error;
        _error = 'Missing verification token.';
      });
      return;
    }
    try {
      await ref.read(authControllerProvider.notifier).verifyEmail(widget.token!);
      if (mounted) setState(() => _state = _VerifyState.success);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _state = _VerifyState.error;
          _error = e.message;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: switch (_state) {
              _VerifyState.loading => const CircularProgressIndicator(),
              _VerifyState.success => Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check_circle_outline, size: 64, color: Colors.green),
                    const SizedBox(height: 16),
                    Text('Email verified!', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => context.go(RoutePaths.login),
                      child: const Text('Continue to sign in'),
                    ),
                  ],
                ),
              _VerifyState.error => Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.error_outline, size: 64, color: Theme.of(context).colorScheme.error),
                    const SizedBox(height: 16),
                    Text(_error ?? 'Verification failed.', textAlign: TextAlign.center),
                    const SizedBox(height: 24),
                    OutlinedButton(
                      onPressed: () => context.push(RoutePaths.resendVerification),
                      child: const Text('Resend verification email'),
                    ),
                    TextButton(
                      onPressed: () => context.go(RoutePaths.login),
                      child: const Text('Back to sign in'),
                    ),
                  ],
                ),
            },
          ),
        ),
      ),
    );
  }
}
