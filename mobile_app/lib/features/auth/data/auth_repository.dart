import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/user.dart';

part 'auth_repository.g.dart';

class LoginResult {
  LoginResult({required this.accessToken, required this.user});
  final String accessToken;
  final User user;
}

/// Wraps every /api/auth/* call this app needs. See
/// backend/auth-service/src/routes/auth.ts for the source of truth.
class AuthRepository {
  AuthRepository(this._dio);

  final Dio _dio;

  Future<LoginResult> login({required String email, required String password}) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/api/auth/login', data: {
        'email': email,
        'password': password,
      });
      return _toLoginResult(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      await _dio.post<Map<String, dynamic>>('/api/auth/register', data: {
        'name': name,
        'email': email,
        'password': password,
      });
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<User> me() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/auth/me');
      return User.fromJson(res.data!['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post<Map<String, dynamic>>('/api/auth/logout');
    } on DioException {
      // Best-effort — always proceed with local logout regardless.
    }
  }

  Future<void> markOnline() async {
    try {
      await _dio.post<void>('/api/auth/online');
    } on DioException {
      // Non-critical.
    }
  }

  Future<void> markOffline() async {
    try {
      await _dio.post<void>('/api/auth/offline');
    } on DioException {
      // Non-critical.
    }
  }

  Future<void> forgotPassword(String email) async {
    try {
      await _dio.post<void>('/api/auth/forgot-password', data: {'email': email});
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> resetPassword({required String token, required String newPassword}) async {
    try {
      await _dio.post<void>('/api/auth/reset-password', data: {
        'token': token,
        'newPassword': newPassword,
      });
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> verifyEmail(String token) async {
    try {
      await _dio.post<void>('/api/auth/verify-email', data: {'token': token});
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> resendVerification(String email) async {
    try {
      await _dio.post<void>('/api/auth/resend-verification', data: {'email': email});
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<User>> searchUsers(String query) async {
    if (query.trim().length < 2) return [];
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/auth/users/search', queryParameters: {'q': query});
      return (res.data!['users'] as List).map((e) => User.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> registerFcmToken(String token) async {
    try {
      await _dio.post<void>('/api/auth/fcm-token', data: {'token': token});
    } on DioException {
      // Non-critical — don't block login/app usage on this.
    }
  }

  Future<void> unregisterFcmToken(String token) async {
    try {
      await _dio.delete<void>('/api/auth/fcm-token', data: {'token': token});
    } on DioException {
      // Non-critical.
    }
  }

  LoginResult _toLoginResult(Map<String, dynamic> data) {
    return LoginResult(
      accessToken: data['accessToken'] as String,
      user: User.fromJson(data['user'] as Map<String, dynamic>),
    );
  }
}

@Riverpod(keepAlive: true)
AuthRepository authRepository(Ref ref) => AuthRepository(ref.watch(dioProvider));
