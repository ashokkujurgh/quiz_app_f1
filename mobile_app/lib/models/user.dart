import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

@freezed
class UserStats with _$UserStats {
  const factory UserStats({
    @Default(0) int friends,
    @Default(0) int posts,
    @Default(0) int quizzesTaken,
    @Default(0) double averageScore,
  }) = _UserStats;

  factory UserStats.fromJson(Map<String, dynamic> json) => _$UserStatsFromJson(json);
}

@freezed
class User with _$User {
  const factory User({
    required String id,
    required String name,
    String? username,
    required String email,
    String? avatar,
    String? coverImage,
    String? bio,
    @Default('user') String role,
    @Default(false) bool isOnline,
    @Default(false) bool isEmailVerified,
    @Default(true) bool isActive,
    UserStats? stats,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(_normalize(json));

  static Map<String, dynamic> _normalize(Map<String, dynamic> json) {
    // Backend uses Mongo's _id; normalize to id for the Dart model.
    if (json.containsKey('_id') && !json.containsKey('id')) {
      return {...json, 'id': json['_id']};
    }
    return json;
  }
}

extension UserX on User {
  bool get isAdmin => role == 'admin';
}
