import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'settings_controller.g.dart';

const _themeModeKey = 'meenzo_theme_mode';

/// Theme mode + a handful of client-side toggles. The web app's Settings
/// page also has notification/privacy toggles, but per the auth-service
/// User model there are no corresponding server fields for those today
/// (isEmailVerified/isActive/isOnline/fcmTokens are the only account-level
/// flags that exist) — so, honestly, those toggles remain local-only stubs
/// here too, matching current backend support rather than pretending they
/// persist server-side.
@riverpod
class SettingsController extends _$SettingsController {
  @override
  Future<ThemeMode> build() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_themeModeKey);
    return switch (stored) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    state = AsyncData(mode);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_themeModeKey, mode.name);
  }
}
