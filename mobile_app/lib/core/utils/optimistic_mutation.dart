/// Shared mutate-then-rollback-on-error helper for optimistic UI updates
/// (post like/save, friend actions, comment actions, etc.) so this pattern
/// isn't reimplemented slightly differently in every feature controller.
///
/// [getCurrent]/[setState] are passed in explicitly (rather than this being a
/// mixin on some base Notifier type) so it works uniformly across Riverpod
/// AsyncNotifier subclasses with different state shapes.
Future<void> runOptimistic<T>({
  required T Function() getCurrent,
  required void Function(T) setState,
  required T Function(T current) optimisticUpdate,
  required Future<void> Function() action,
}) async {
  final previous = getCurrent();
  setState(optimisticUpdate(previous));
  try {
    await action();
  } catch (_) {
    setState(previous);
    rethrow;
  }
}
