import 'package:flutter/material.dart';
import 'screens/webview_screen.dart';
import 'screens/no_internet_screen.dart';

class MeenzoApp extends StatelessWidget {
  const MeenzoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Meenzo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6C3EF5),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/': (_) => const WebViewScreen(),
        '/no-internet': (_) => const NoInternetScreen(),
      },
    );
  }
}
