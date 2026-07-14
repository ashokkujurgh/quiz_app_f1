/// Typed error wrapper for the backend's {success:false, message, errors?} envelope.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.errors});

  final String message;
  final int? statusCode;
  final List<String>? errors;

  factory ApiException.fromResponseData(dynamic data, {int? statusCode}) {
    if (data is Map<String, dynamic>) {
      final message = data['message'] as String? ?? 'Something went wrong.';
      final rawErrors = data['errors'];
      List<String>? errors;
      if (rawErrors is List) {
        errors = rawErrors
            .map((e) => e is Map ? (e['msg']?.toString() ?? '') : e.toString())
            .where((e) => e.isNotEmpty)
            .toList();
      }
      return ApiException(message, statusCode: statusCode, errors: errors);
    }
    return ApiException('Something went wrong.', statusCode: statusCode);
  }

  @override
  String toString() => message;
}
