import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;
import '../services/session_service.dart';
import '../services/notification_service.dart';

const String _authServiceUrl = 'https://api.meenzo.com/api/auth';

const String _appUrl = 'https://meenzo.com';

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  StreamSubscription? _connectivitySub;

  @override
  void initState() {
    super.initState();
    _initWebView();
    _listenConnectivity();
    NotificationService.setNavigationCallback(_handleNotificationNavigation);
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0A0A0A))
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (_) => setState(() { _isLoading = true; _hasError = false; }),
        onPageFinished: (url) async {
          setState(() => _isLoading = false);
          await _injectSessionBridge();
          await _restoreSession();
          // Register FCM token with backend whenever a page loads (covers login)
          final fcmToken = await NotificationService.getToken();
          if (fcmToken != null) await _registerFcmToken(fcmToken);
        },
        onWebResourceError: (error) {
          if (error.isForMainFrame ?? true) {
            setState(() { _isLoading = false; _hasError = true; });
          }
        },
        onNavigationRequest: (req) {
          // Keep all meenzo.com navigation inside the webview
          if (req.url.startsWith(_appUrl) || req.url.startsWith('https://meenzo.com')) {
            return NavigationDecision.navigate;
          }
          return NavigationDecision.navigate;
        },
      ))
      ..addJavaScriptChannel(
        'FlutterSession',
        onMessageReceived: (msg) => _onSessionMessage(msg.message),
      )
      ..loadRequest(Uri.parse(_appUrl));
  }

  // Inject JS bridge so the web app can notify Flutter of login/logout
  Future<void> _injectSessionBridge() async {
    await _controller.runJavaScript('''
      (function() {
        if (window.__flutterBridgeInjected) return;
        window.__flutterBridgeInjected = true;

        // Intercept localStorage.setItem to watch for auth tokens
        const _origSet = localStorage.setItem.bind(localStorage);
        const _origRemove = localStorage.removeItem.bind(localStorage);
        const _origClear = localStorage.clear.bind(localStorage);

        localStorage.setItem = function(key, value) {
          _origSet(key, value);
          if (key === 'accessToken' || key === 'persist:auth' || key === 'auth') {
            FlutterSession.postMessage(JSON.stringify({type: 'save', key: key, value: value}));
          }
        };

        localStorage.removeItem = function(key) {
          _origRemove(key);
          if (key === 'accessToken' || key === 'persist:auth' || key === 'auth') {
            FlutterSession.postMessage(JSON.stringify({type: 'remove', key: key}));
          }
        };

        localStorage.clear = function() {
          _origClear();
          FlutterSession.postMessage(JSON.stringify({type: 'clear'}));
        };

        // Also expose FCM token setter
        window.setFCMToken = function(token) {
          FlutterSession.postMessage(JSON.stringify({type: 'fcm', token: token}));
        };
      })();
    ''');
  }

  // Restore saved localStorage keys into the webview on load
  Future<void> _restoreSession() async {
    final entries = await SessionService.getAll();
    if (entries.isEmpty) return;
    final js = StringBuffer();
    for (final e in entries.entries) {
      final escaped = e.value.replaceAll(r'\', r'\\').replaceAll("'", r"\'");
      js.write("localStorage.setItem('${e.key}', '$escaped');");
    }
    // Reload so the app picks up restored auth state
    await _controller.runJavaScript(js.toString());
    // Soft reload without re-triggering _restoreSession (check flag)
    await _controller.runJavaScript('''
      if (!window.__sessionRestored) {
        window.__sessionRestored = true;
        window.location.reload();
      }
    ''');
  }

  void _onSessionMessage(String raw) async {
    try {
      // Parse JSON manually via Dart (no dart:convert needed for simple cases)
      if (raw.contains('"type":"save"')) {
        final key = _extract(raw, 'key');
        final value = _extract(raw, 'value');
        if (key != null && value != null) {
          await SessionService.save(key, value);
        }
      } else if (raw.contains('"type":"remove"')) {
        final key = _extract(raw, 'key');
        if (key != null) await SessionService.remove(key);
      } else if (raw.contains('"type":"clear"')) {
        await SessionService.clear();
      } else if (raw.contains('"type":"fcm"')) {
        final token = _extract(raw, 'token');
        if (token != null) await _registerFcmToken(token);
      }
    } catch (e) {
      debugPrint('Session bridge error: $e');
    }
  }

  String? _extract(String json, String key) {
    final pattern = RegExp('"$key":"((?:[^"\\\\]|\\\\.)*)"');
    return pattern.firstMatch(json)?.group(1);
  }

  Future<void> _registerFcmToken(String fcmToken) async {
    try {
      final session = await SessionService.getAll();
      // Try to get accessToken from session
      String? accessToken;
      for (final entry in session.entries) {
        if (entry.key == 'accessToken') {
          accessToken = entry.value;
          break;
        }
        // Handle Redux persist:auth or auth key with JSON value
        if ((entry.key == 'persist:auth' || entry.key == 'auth') && entry.value.contains('accessToken')) {
          final match = RegExp(r'"accessToken"\s*:\s*"([^"]+)"').firstMatch(entry.value);
          if (match != null) { accessToken = match.group(1); break; }
        }
      }
      if (accessToken == null) return;

      await http.post(
        Uri.parse('$_authServiceUrl/fcm-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
        },
        body: jsonEncode({'token': fcmToken}),
      );
      debugPrint('FCM token registered with backend.');
    } catch (e) {
      debugPrint('FCM token registration failed: $e');
    }
  }

  void _handleNotificationNavigation(String? url) {
    if (url != null && url.isNotEmpty) {
      _controller.loadRequest(Uri.parse(url.startsWith('http') ? url : '$_appUrl$url'));
    }
  }

  void _listenConnectivity() {
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final offline = results.every((r) => r == ConnectivityResult.none);
      if (offline && mounted) {
        Navigator.pushNamed(context, '/no-internet');
      }
    });
  }

  Future<bool> _onWillPop() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false;
    }
    return true;
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarBrightness: Brightness.dark,
    ));

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final canGoBack = await _controller.canGoBack();
        if (canGoBack) {
          await _controller.goBack();
        } else {
          if (context.mounted) Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF0A0A0A),
        body: SafeArea(
          child: Stack(
            children: [
              if (!_hasError) WebViewWidget(controller: _controller),
              if (_isLoading && !_hasError)
                const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Image(image: AssetImage('assets/logo.png'), width: 80, height: 80),
                      SizedBox(height: 24),
                      CircularProgressIndicator(color: Color(0xFF6C3EF5)),
                    ],
                  ),
                ),
              if (_hasError)
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.wifi_off, size: 64, color: Colors.white54),
                      const SizedBox(height: 16),
                      const Text('Could not load page',
                          style: TextStyle(color: Colors.white70, fontSize: 16)),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () => _controller.reload(),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
