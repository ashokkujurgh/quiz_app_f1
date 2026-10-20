import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'push_service.dart';
import 'webview_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Reads android/app/google-services.json (Firebase project meenzo-b6b92).
  await Firebase.initializeApp();
  try {
    await PushService.instance.init();
  } catch (e) {
    // Push is optional — the site must still open if FCM setup fails.
    debugPrint('[Push] init failed: $e');
  }
  runApp(const MeenzoApp());
}

class MeenzoApp extends StatelessWidget {
  const MeenzoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Meenzo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: const Color(0xFF00D4CC), useMaterial3: true),
      home: WebViewScreen(initialUrl: PushService.instance.initialUrl),
    );
  }
}
