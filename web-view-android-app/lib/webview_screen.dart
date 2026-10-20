import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:url_launcher/url_launcher.dart';

import 'config.dart';
import 'fcm_bridge.dart';
import 'push_service.dart';

const _brandTeal = Color(0xFF00D4CC);
const _brandNavy = Color(0xFF111D4A);

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key, this.initialUrl});

  final String? initialUrl;

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  InAppWebViewController? _controller;
  late final PullToRefreshController _pullToRefresh;
  final List<StreamSubscription<String>> _subs = [];

  double _progress = 0;
  bool _firstLoadDone = false;
  bool _hasError = false;
  String? _failedUrl;

  @override
  void initState() {
    super.initState();
    _pullToRefresh = PullToRefreshController(
      settings: PullToRefreshSettings(color: _brandTeal),
      onRefresh: () => _controller?.reload(),
    );
    _subs.add(PushService.instance.onOpenUrl.listen(_openFromNotification));
    _subs.add(PushService.instance.onToken.listen((_) => _injectFcmToken()));
  }

  @override
  void dispose() {
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }

  void _openFromNotification(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    if (!AppConfig.isInternal(uri)) {
      _launchExternal(uri);
      return;
    }
    setState(() => _hasError = false);
    _controller?.loadUrl(urlRequest: URLRequest(url: WebUri.uri(uri)));
  }

  Future<void> _injectFcmToken() async {
    final token = PushService.instance.currentToken;
    final c = _controller;
    if (token == null || c == null) return;
    final url = await c.getUrl();
    if (url == null || !AppConfig.isInternal(url)) return;
    await c.evaluateJavascript(source: fcmRegistrationScript(token));
  }

  Future<void> _launchExternal(Uri uri) async {
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      // No app can handle it (e.g. an unknown intent:// scheme) — ignore.
    }
  }

  Future<NavigationActionPolicy> _shouldOverride(
    InAppWebViewController controller,
    NavigationAction action,
  ) async {
    final uri = action.request.url;
    if (uri == null) return NavigationActionPolicy.ALLOW;
    // Ads and other iframes navigate on their own; only main-frame
    // navigations decide whether we leave the app.
    if (!action.isForMainFrame) return NavigationActionPolicy.ALLOW;
    const passThrough = {'about', 'data', 'blob', 'javascript'};
    if (passThrough.contains(uri.scheme) || AppConfig.isInternal(uri)) {
      return NavigationActionPolicy.ALLOW;
    }
    _launchExternal(uri);
    return NavigationActionPolicy.CANCEL;
  }

  Future<bool> _onCreateWindow(
    InAppWebViewController controller,
    CreateWindowAction action,
  ) async {
    // target="_blank" / window.open: keep site pages in this WebView, send
    // everything else to the browser or the matching app.
    final uri = action.request.url;
    if (uri == null) return false;
    if (AppConfig.isInternal(uri)) {
      controller.loadUrl(urlRequest: URLRequest(url: uri));
    } else {
      _launchExternal(uri);
    }
    return false;
  }

  Future<void> _handleBack() async {
    final c = _controller;
    if (c != null && await c.canGoBack()) {
      await c.goBack();
    } else {
      await SystemNavigator.pop();
    }
  }

  void _retry() {
    setState(() {
      _hasError = false;
      _progress = 0;
    });
    final url = _failedUrl ?? widget.initialUrl ?? AppConfig.startUrl;
    _controller?.loadUrl(urlRequest: URLRequest(url: WebUri(url)));
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _handleBack();
      },
      child: AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.dark.copyWith(statusBarColor: Colors.white),
        child: Scaffold(
          backgroundColor: Colors.white,
          body: SafeArea(
            child: Stack(
              children: [
                InAppWebView(
                  initialUrlRequest: URLRequest(
                    url: WebUri(widget.initialUrl ?? AppConfig.startUrl),
                  ),
                  initialSettings: InAppWebViewSettings(
                    javaScriptEnabled: true,
                    domStorageEnabled: true,
                    databaseEnabled: true,
                    thirdPartyCookiesEnabled: true,
                    useShouldOverrideUrlLoading: true,
                    supportMultipleWindows: true,
                    javaScriptCanOpenWindowsAutomatically: true,
                    mediaPlaybackRequiresUserGesture: false,
                    allowsInlineMediaPlayback: true,
                    supportZoom: false,
                    // Lets the site detect the app if it ever needs to.
                    applicationNameForUserAgent: 'MeenzoApp/1.0',
                  ),
                  pullToRefreshController: _pullToRefresh,
                  onWebViewCreated: (c) => _controller = c,
                  shouldOverrideUrlLoading: _shouldOverride,
                  onCreateWindow: _onCreateWindow,
                  onLoadStart: (_, __) => setState(() => _hasError = false),
                  onProgressChanged: (_, p) {
                    if (p == 100) _pullToRefresh.endRefreshing();
                    setState(() => _progress = p / 100);
                  },
                  onLoadStop: (_, __) async {
                    _pullToRefresh.endRefreshing();
                    setState(() => _firstLoadDone = true);
                    await _injectFcmToken();
                  },
                  onReceivedError: (_, request, error) {
                    if (request.isForMainFrame != true) return;
                    if (error.type == WebResourceErrorType.CANCELLED) return;
                    _pullToRefresh.endRefreshing();
                    setState(() {
                      _hasError = true;
                      _failedUrl = request.url.toString();
                    });
                  },
                ),
                if (_progress < 1 && !_hasError)
                  LinearProgressIndicator(
                    value: _progress > 0 ? _progress : null,
                    minHeight: 3,
                    color: _brandTeal,
                    backgroundColor: Colors.transparent,
                  ),
                if (!_firstLoadDone && !_hasError) const _Splash(),
                if (_hasError) _OfflineView(onRetry: _retry),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: Colors.white,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image(image: AssetImage('assets/icon.png'), width: 96, height: 96),
            SizedBox(height: 24),
            SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(strokeWidth: 3, color: _brandTeal),
            ),
          ],
        ),
      ),
    );
  }
}

class _OfflineView extends StatelessWidget {
  const _OfflineView({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.white,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 64, color: _brandNavy),
              const SizedBox(height: 16),
              const Text(
                'No connection',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: _brandNavy),
              ),
              const SizedBox(height: 8),
              const Text(
                "Meenzo couldn't load. Check your internet connection and try again.",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 15, color: Colors.black54),
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onRetry,
                style: FilledButton.styleFrom(backgroundColor: _brandNavy),
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
