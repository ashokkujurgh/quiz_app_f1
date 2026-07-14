// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'settings_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$settingsControllerHash() =>
    r'15225142c09811f7009fa933c0b23b97fef2900a';

/// Theme mode + a handful of client-side toggles. The web app's Settings
/// page also has notification/privacy toggles, but per the auth-service
/// User model there are no corresponding server fields for those today
/// (isEmailVerified/isActive/isOnline/fcmTokens are the only account-level
/// flags that exist) — so, honestly, those toggles remain local-only stubs
/// here too, matching current backend support rather than pretending they
/// persist server-side.
///
/// Copied from [SettingsController].
@ProviderFor(SettingsController)
final settingsControllerProvider =
    AutoDisposeAsyncNotifierProvider<SettingsController, ThemeMode>.internal(
      SettingsController.new,
      name: r'settingsControllerProvider',
      debugGetCreateSourceHash:
          const bool.fromEnvironment('dart.vm.product')
              ? null
              : _$settingsControllerHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

typedef _$SettingsController = AutoDisposeAsyncNotifier<ThemeMode>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
