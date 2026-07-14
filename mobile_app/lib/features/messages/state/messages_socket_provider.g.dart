// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'messages_socket_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$messagesSocketHash() => r'1d0133e5fb876571a4fab9cc9d49847e86876e8c';

/// Deliberately NOT keepAlive — auto-disposed once nothing in the Messages
/// feature is watching it, so the socket connects when entering the tab and
/// disconnects on leaving. Shared by conversations_controller and whichever
/// active_thread_controller instance is open, so there's exactly one
/// connection per visit to the feature, with each controller subscribing to
/// the broadcast streams it cares about independently.
///
/// Copied from [messagesSocket].
@ProviderFor(messagesSocket)
final messagesSocketProvider =
    AutoDisposeFutureProvider<MessageSocketService>.internal(
      messagesSocket,
      name: r'messagesSocketProvider',
      debugGetCreateSourceHash:
          const bool.fromEnvironment('dart.vm.product')
              ? null
              : _$messagesSocketHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef MessagesSocketRef = AutoDisposeFutureProviderRef<MessageSocketService>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
