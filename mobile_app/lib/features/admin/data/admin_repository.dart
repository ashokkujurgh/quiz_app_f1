import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/user.dart';

part 'admin_repository.g.dart';

class AdminUsersPage {
  AdminUsersPage({required this.users, required this.total, required this.page, required this.pages});
  final List<User> users;
  final int total;
  final int page;
  final int pages;
}

class AdminLoginResult {
  AdminLoginResult({required this.accessToken, required this.user});
  final String accessToken;
  final User user;
}

/// Wraps every /api/admin/* call. See
/// backend/auth-service/src/controllers/adminController.ts for source of truth.
class AdminRepository {
  AdminRepository(this._dio);

  final Dio _dio;

  Future<AdminLoginResult> login({required String email, required String password}) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/api/admin/login', data: {
        'email': email,
        'password': password,
      });
      return AdminLoginResult(
        accessToken: res.data!['accessToken'] as String,
        user: User.fromJson(res.data!['user'] as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<AdminUsersPage> getUsers({int page = 1, int limit = 20, String? search}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/admin/users', queryParameters: {
        'page': page,
        'limit': limit,
        if (search != null && search.isNotEmpty) 'search': search,
      });
      final pagination = res.data!['pagination'] as Map<String, dynamic>? ?? {};
      return AdminUsersPage(
        users: (res.data!['users'] as List).map((e) => User.fromJson(e as Map<String, dynamic>)).toList(),
        total: pagination['total'] as int? ?? 0,
        page: pagination['page'] as int? ?? 1,
        pages: pagination['pages'] as int? ?? 1,
      );
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<User> createUser({required String name, required String email, required String password}) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/api/admin/users', data: {
        'name': name,
        'email': email,
        'password': password,
      });
      return User.fromJson(res.data!['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<bool> toggleUserStatus(String userId) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>('/api/admin/users/$userId/status');
      return res.data!['isActive'] as bool;
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }
}

@Riverpod(keepAlive: true)
AdminRepository adminRepository(Ref ref) => AdminRepository(ref.watch(dioProvider));
