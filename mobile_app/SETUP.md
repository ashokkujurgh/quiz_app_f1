# Meenzo Flutter App — Setup Guide

## Prerequisites
- Flutter 3.x
- Firebase project (same one used by the web app)

## Firebase Setup (required for push notifications)

1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. Add Android app: package name `com.meenzo.app`
3. Add iOS app: bundle ID `com.meenzo.app`
4. Download `google-services.json` → place in `android/app/`
5. Download `GoogleService-Info.plist` → place in `ios/Runner/`
6. Run `flutterfire configure` OR manually fill in `lib/firebase_options.dart` with your project values

## Run

```bash
flutter pub get
flutter run
```

## Sending push notifications from backend

Add to your backend (e.g. quiz-service) when a quiz starts or a friend request is sent:

```js
const admin = require('firebase-admin');
await admin.messaging().send({
  token: userFcmToken,           // stored when user first opens app
  notification: { title: 'Quiz Starting!', body: 'Your quiz begins now.' },
  data: { url: '/quizzes' },     // deep link inside the app
});
```

The app will navigate to `https://meenzo.com/quizzes` when the notification is tapped.

## Session persistence
The app intercepts `localStorage.setItem` in the WebView and mirrors the auth tokens to `SharedPreferences`. On next launch, those tokens are restored before the page loads — so users stay logged in across app restarts.
