import 'package:freezed_annotation/freezed_annotation.dart';

part 'comment.freezed.dart';
part 'comment.g.dart';

@freezed
class AuthorSnapshot with _$AuthorSnapshot {
  const factory AuthorSnapshot({
    required String userId,
    required String name,
    required String username,
    String? avatar,
  }) = _AuthorSnapshot;

  factory AuthorSnapshot.fromJson(Map<String, dynamic> json) =>
      _$AuthorSnapshotFromJson(json);
}

@freezed
class Comment with _$Comment {
  const factory Comment({
    required String id,
    required AuthorSnapshot author,
    required String content,
    @Default(0) int likes,
    @Default(<String>[]) List<String> likedBy,
    required String createdAt,
  }) = _Comment;

  factory Comment.fromJson(Map<String, dynamic> json) => _$CommentFromJson(_normalize(json));

  static Map<String, dynamic> _normalize(Map<String, dynamic> json) {
    if (json.containsKey('_id') && !json.containsKey('id')) {
      return {...json, 'id': json['_id']};
    }
    return json;
  }
}
