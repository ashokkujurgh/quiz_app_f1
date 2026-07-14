/// Build-time environment configuration.
///
/// Pass at build/run time with:
///   flutter run --dart-define-from-file=env/dev.json
class Env {
  Env._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://meenzo.com',
  );

  static const String internalServiceSecret = String.fromEnvironment(
    'INTERNAL_SERVICE_SECRET',
    defaultValue: '',
  );
}
