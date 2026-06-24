import 'package:shared_preferences/shared_preferences.dart';

const _prefix = 'ws_';

class SessionService {
  static Future<void> save(String key, String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_prefix$key', value);
  }

  static Future<void> remove(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$_prefix$key');
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys().where((k) => k.startsWith(_prefix)).toList();
    for (final k in keys) {
      await prefs.remove(k);
    }
  }

  static Future<Map<String, String>> getAll() async {
    final prefs = await SharedPreferences.getInstance();
    final result = <String, String>{};
    for (final k in prefs.getKeys()) {
      if (k.startsWith(_prefix)) {
        final val = prefs.getString(k);
        if (val != null) result[k.substring(_prefix.length)] = val;
      }
    }
    return result;
  }
}
