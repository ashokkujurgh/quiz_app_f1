import 'dart:io';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:meenzo/app.dart';
import 'package:meenzo/core/network/dio_client.dart';

void main() {
  testWidgets('App boots to the initial route without throwing', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cookieJarProvider.overrideWithValue(
            PersistCookieJar(storage: FileStorage(Directory.systemTemp.path)),
          ),
        ],
        child: const MeenzoApp(),
      ),
    );
    await tester.pump();
  });
}
