import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../features/auth/screens/forgot_password_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/resend_verification_screen.dart';
import '../../features/auth/screens/reset_password_screen.dart';
import '../../features/auth/screens/signup_screen.dart';
import '../../features/auth/screens/verify_email_screen.dart';
import '../../features/auth/state/auth_controller.dart';
import '../../features/admin/screens/admin_dashboard_screen.dart';
import '../../features/admin/screens/admin_login_screen.dart';
import '../../features/friends/screens/friends_screen.dart';
import '../../models/user.dart';
import '../../features/history/screens/history_screen.dart';
import '../../features/home_feed/screens/home_screen.dart';
import '../../features/leaderboard/screens/leaderboard_screen.dart';
import '../../features/messages/screens/message_thread_screen.dart';
import '../../features/messages/screens/messages_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/posts/screens/post_detail_screen.dart';
import '../../features/posts/screens/posts_screen.dart';
import '../../features/practice_quiz/screens/practice_quiz_screen.dart';
import '../../features/practice_quiz/state/practice_quiz_controller.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/profile/screens/user_profile_screen.dart';
import '../../features/quiz_create/screens/create_quiz_screen.dart';
import '../../features/quiz_play/screens/quiz_play_screen.dart';
import '../../features/quiz_result/screens/quiz_result_screen.dart';
import '../../features/quizzes_browse/screens/quizzes_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/shell/screens/app_shell.dart';
import '../../services/notification_service.dart';
import 'deep_link_resolver.dart';
import 'route_paths.dart';

part 'app_router.g.dart';

const _authOnlyRoutes = {
  RoutePaths.login,
  RoutePaths.signup,
  RoutePaths.forgotPassword,
  RoutePaths.resendVerification,
  RoutePaths.verifyEmail,
  RoutePaths.resetPassword,
};

@Riverpod(keepAlive: true)
GoRouter appRouter(Ref ref) {
  final refreshNotifier = _AuthRefreshNotifier();
  ref.listen(authControllerProvider, (_, __) => refreshNotifier.ping());
  ref.onDispose(refreshNotifier.dispose);

  return GoRouter(
    initialLocation: RoutePaths.login,
    refreshListenable: refreshNotifier,
    redirect: (context, state) {
      final authState = ref.read(authControllerProvider);
      // Still restoring the stored session on cold start — don't redirect yet.
      if (authState.isLoading) return null;

      final user = authState.valueOrNull;
      final isAuthenticated = user != null;
      final isAuthOnlyRoute = _authOnlyRoutes.contains(state.matchedLocation);

      if (!isAuthenticated && !isAuthOnlyRoute && state.matchedLocation != RoutePaths.adminLogin) {
        return RoutePaths.login;
      }
      if (isAuthenticated && isAuthOnlyRoute) return RoutePaths.home;
      if (state.matchedLocation == RoutePaths.admin && user?.isAdmin != true) {
        return RoutePaths.adminLogin;
      }
      return null;
    },
    routes: [
      GoRoute(path: RoutePaths.login, builder: (context, state) => const LoginScreen()),
      GoRoute(path: RoutePaths.signup, builder: (context, state) => const SignupScreen()),
      GoRoute(
        path: RoutePaths.forgotPassword,
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: RoutePaths.resendVerification,
        builder: (context, state) => const ResendVerificationScreen(),
      ),
      GoRoute(
        path: RoutePaths.verifyEmail,
        builder: (context, state) => VerifyEmailScreen(token: state.uri.queryParameters['token']),
      ),
      GoRoute(
        path: RoutePaths.resetPassword,
        builder: (context, state) => ResetPasswordScreen(token: state.uri.queryParameters['token']),
      ),
      GoRoute(
        path: RoutePaths.postDetail,
        builder: (context, state) => PostDetailScreen(idOrSlug: state.pathParameters['slug']!),
      ),
      GoRoute(path: RoutePaths.posts, builder: (context, state) => const PostsScreen()),
      GoRoute(
        path: RoutePaths.quizPlay,
        builder: (context, state) => QuizPlayScreen(quizId: state.pathParameters['quizId']!),
      ),
      GoRoute(
        path: RoutePaths.quizResult,
        builder: (context, state) => QuizResultScreen(quizId: state.pathParameters['quizId']!),
      ),
      GoRoute(path: RoutePaths.quizCreate, builder: (context, state) => const CreateQuizScreen()),
      GoRoute(
        path: RoutePaths.practiceQuiz,
        builder: (context, state) => PracticeQuizScreen(args: state.extra as PracticeQuizArgs),
      ),
      GoRoute(path: RoutePaths.leaderboard, builder: (context, state) => const LeaderboardScreen()),
      GoRoute(
        path: RoutePaths.userProfile,
        builder: (context, state) => UserProfileScreen(userId: state.pathParameters['userId']!),
      ),
      GoRoute(path: RoutePaths.history, builder: (context, state) => const HistoryScreen()),
      GoRoute(path: RoutePaths.notifications, builder: (context, state) => const NotificationsScreen()),
      GoRoute(path: RoutePaths.settings, builder: (context, state) => const SettingsScreen()),
      GoRoute(path: RoutePaths.adminLogin, builder: (context, state) => const AdminLoginScreen()),
      GoRoute(path: RoutePaths.admin, builder: (context, state) => const AdminDashboardScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: RoutePaths.home, builder: (context, state) => const HomeScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: RoutePaths.quizzes, builder: (context, state) => const QuizzesScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: RoutePaths.friends, builder: (context, state) => const FriendsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: RoutePaths.messages,
              builder: (context, state) => const MessagesScreen(),
              routes: [
                GoRoute(
                  path: ':conversationId',
                  builder: (context, state) =>
                      MessageThreadScreen(conversationId: state.pathParameters['conversationId']!),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: RoutePaths.profile, builder: (context, state) => const ProfileScreen()),
          ]),
        ],
      ),
    ],
  );
}

class _AuthRefreshNotifier extends ChangeNotifier {
  void ping() => notifyListeners();
}

/// Resolves a pending cold-start notification deep link, if any, once the
/// router/auth state is actually ready to navigate. Called from app.dart's
/// first frame.
void consumePendingDeepLink(GoRouter router) {
  final path = resolveDeepLink(NotificationService.consumePendingInitialUrl());
  if (path != null) router.go(path);
}
