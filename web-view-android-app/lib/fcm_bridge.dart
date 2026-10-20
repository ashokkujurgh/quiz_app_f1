import 'dart:convert';

/// JavaScript run inside meenzo.com pages that registers this device's FCM
/// token for whoever is logged in.
///
/// The web app keeps its JWT in `localStorage.access_token` (see
/// quizapp/src/app/store/slices/authSlice.ts), so the page itself calls the
/// existing auth-service endpoints:
///   POST   /api/auth/fcm-token  { token }   on login / token change
///   DELETE /api/auth/fcm-token  { token }   on logout
/// It polls localStorage because login/logout happen inside the SPA without a
/// page load. Safe to run repeatedly: later runs only update the FCM token.
String fcmRegistrationScript(String fcmToken) => '''
(function (fcm) {
  window.__meenzoFcm = fcm;
  if (window.__meenzoFcmTimer) { window.__meenzoFcmSync(); return; }
  var KEY = 'meenzo_app_fcm';
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function write(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  function call(method, access, token) {
    return fetch('/api/auth/fcm-token', {
      method: method,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + access },
      body: JSON.stringify({ token: token })
    });
  }
  var busy = false;
  window.__meenzoFcmSync = function () {
    var fcm = window.__meenzoFcm;
    if (!fcm || busy) return;
    var access = read('access_token');
    var prev = null;
    try { prev = JSON.parse(read(KEY) || 'null'); } catch (e) {}
    if (access) {
      if (prev && prev.access === access && prev.fcm === fcm) return;
      busy = true;
      call('POST', access, fcm)
        .then(function (r) { if (r.ok) write(KEY, JSON.stringify({ access: access, fcm: fcm })); })
        .catch(function () {})
        .then(function () { busy = false; });
    } else if (prev) {
      // Logged out: stop pushes for that account on this device.
      write(KEY, null);
      call('DELETE', prev.access, prev.fcm).catch(function () {});
    }
  };
  window.__meenzoFcmTimer = setInterval(window.__meenzoFcmSync, 3000);
  window.__meenzoFcmSync();
})(${jsonEncode(fcmToken)});
''';
