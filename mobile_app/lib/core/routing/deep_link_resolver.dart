import 'route_paths.dart';

/// Translates a notification's `data.url` (a web-app path, e.g.
/// "/quiz/play/507f..." or "/posts/some-slug") into a go_router-compatible
/// path. Kept as an explicit translation layer rather than assuming the web
/// path string can be passed straight to router.go(), since param names /
/// route shapes can diverge between the web and native route trees over time.
String? resolveDeepLink(String? url) {
  if (url == null || url.isEmpty) return null;
  final uri = Uri.tryParse(url);
  if (uri == null) return null;

  final segments = uri.pathSegments;
  if (segments.isEmpty) return null;

  // /quiz/play/:quizId
  if (segments.length == 3 && segments[0] == 'quiz' && segments[1] == 'play') {
    return RoutePaths.quizPlay.replaceFirst(':quizId', segments[2]);
  }
  // /posts/:slug
  if (segments.length == 2 && segments[0] == 'posts') {
    return RoutePaths.postDetail.replaceFirst(':slug', segments[1]);
  }
  // /profile/:userId
  if (segments.length == 2 && segments[0] == 'profile') {
    return RoutePaths.userProfile.replaceFirst(':userId', segments[1]);
  }
  // Direct 1:1 matches (no params) — messages, friends, notifications, etc.
  const directPaths = {
    RoutePaths.home,
    RoutePaths.quizzes,
    RoutePaths.friends,
    RoutePaths.messages,
    RoutePaths.leaderboard,
    RoutePaths.profile,
    RoutePaths.notifications,
  };
  if (directPaths.contains(uri.path)) return uri.path;

  return null;
}
