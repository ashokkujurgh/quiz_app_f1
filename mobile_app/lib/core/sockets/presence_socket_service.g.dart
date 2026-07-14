// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'presence_socket_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$presenceSocketServiceHash() =>
    r'acf7751d36b8624b0f3209caaaf27b375a22cfbe';

/// See also [presenceSocketService].
@ProviderFor(presenceSocketService)
final presenceSocketServiceProvider = Provider<PresenceSocketService>.internal(
  presenceSocketService,
  name: r'presenceSocketServiceProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$presenceSocketServiceHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef PresenceSocketServiceRef = ProviderRef<PresenceSocketService>;
String _$onlineUserIdsHash() => r'40de5795593a5d3f5b3adbab0a9eeeb7f90d801d';

/// Reactive set of currently-online user IDs, for widgets like FriendCard /
/// ConversationTile to show an online dot via ref.watch.
///
/// Copied from [OnlineUserIds].
@ProviderFor(OnlineUserIds)
final onlineUserIdsProvider =
    NotifierProvider<OnlineUserIds, Set<String>>.internal(
      OnlineUserIds.new,
      name: r'onlineUserIdsProvider',
      debugGetCreateSourceHash:
          const bool.fromEnvironment('dart.vm.product')
              ? null
              : _$onlineUserIdsHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

typedef _$OnlineUserIds = Notifier<Set<String>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
