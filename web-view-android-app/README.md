# Meenzo Android app

Flutter WebView wrapper around https://meenzo.com (package `com.meenzo.app`,
Firebase project `meenzo-b6b92`, config in `android/app/google-services.json`).

- Opens `https://meenzo.com/home`; meenzo.com links stay in the app, other links,
  `mailto:` and `tel:` open outside it. Back button walks WebView history.
- Push: Firebase Cloud Messaging. The FCM token is handed to the page, which
  registers it with `POST /api/auth/fcm-token` using the logged-in user's
  `access_token` (see `lib/fcm_bridge.dart`) and removes it on logout.
- Tapping a notification opens `data.url` / `data.link` if present, otherwise a page
  picked from `data.type` (`lib/push_service.dart` → `urlForData`).

```bash
flutter build apk --debug      # build/app/outputs/flutter-apk/app-debug.apk
dart run flutter_launcher_icons # regenerate launcher icons from assets/icon.png
```

Release builds are still signed with the debug key — add a real keystore in
`android/app/build.gradle.kts` before publishing to Play.
