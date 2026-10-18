import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { AppLayout } from '../components/layout/AppLayout';
import { NavOnlyLayout } from '../components/layout/NavOnlyLayout';

// ── Route-level code splitting ────────────────────────────────────────────────
// Each page is its own chunk, downloaded the first time its route is visited.
// Layouts stay in the main bundle so the navbar/sidebars appear immediately.
function lazyPage<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => load().then((m) => ({ default: m[name] })));
}

const LoginPage              = lazyPage(() => import('../components/pages/LoginPage'), 'LoginPage');
const SignupPage             = lazyPage(() => import('../components/pages/SignupPage'), 'SignupPage');
const ForgotPasswordPage     = lazyPage(() => import('../components/pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage      = lazyPage(() => import('../components/pages/ResetPasswordPage'), 'ResetPasswordPage');
const VerifyEmailPage        = lazyPage(() => import('../components/pages/VerifyEmailPage'), 'VerifyEmailPage');
const ResendVerificationPage = lazyPage(() => import('../components/pages/ResendVerificationPage'), 'ResendVerificationPage');
const HomePage               = lazyPage(() => import('../components/pages/HomePage'), 'HomePage');
const QuizzesPage            = lazyPage(() => import('../components/pages/QuizzesPage'), 'QuizzesPage');
const QuizPlayPage           = lazyPage(() => import('../components/pages/QuizPlayPage'), 'QuizPlayPage');
const CreateQuizPage         = lazyPage(() => import('../components/pages/CreateQuizPage'), 'CreateQuizPage');
const QuizResultPage         = lazyPage(() => import('../components/pages/QuizResultPage'), 'QuizResultPage');
const PracticeQuizPage       = lazyPage(() => import('../components/pages/PracticeQuizPage'), 'PracticeQuizPage');
const FriendsPage            = lazyPage(() => import('../components/pages/FriendsPage'), 'FriendsPage');
const MessagesPage           = lazyPage(() => import('../components/pages/MessagesPage'), 'MessagesPage');
const LeaderboardPage        = lazyPage(() => import('../components/pages/LeaderboardPage'), 'LeaderboardPage');
const ProfilePage            = lazyPage(() => import('../components/pages/ProfilePage'), 'ProfilePage');
const UserProfilePage        = lazyPage(() => import('../components/pages/UserProfilePage'), 'UserProfilePage');
const HistoryPage            = lazyPage(() => import('../components/pages/HistoryPage'), 'HistoryPage');
const NotificationsPage      = lazyPage(() => import('../components/pages/NotificationsPage'), 'NotificationsPage');
const SettingsPage           = lazyPage(() => import('../components/pages/SettingsPage'), 'SettingsPage');
const AdminDashboard         = lazyPage(() => import('../components/pages/AdminDashboard'), 'AdminDashboard');
const PostDetailPage         = lazyPage(() => import('../components/pages/PostDetailPage'), 'PostDetailPage');
const PostsPage              = lazyPage(() => import('../components/pages/PostsPage'), 'PostsPage');
const AboutPage              = lazyPage(() => import('../components/pages/AboutPage'), 'AboutPage');
const PrivacyPolicyPage      = lazyPage(() => import('../components/pages/PrivacyPolicyPage'), 'PrivacyPolicyPage');
const ContactPage            = lazyPage(() => import('../components/pages/ContactPage'), 'ContactPage');

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
      <CircularProgress size={32} />
    </Box>
  );
}

/** Wrap a lazy page so its loading spinner shows inside the layout, not over the whole app. */
const page = (node: ReactNode) => <Suspense fallback={<PageLoader />}>{node}</Suspense>;

function RequireAuth({ children }: { children: JSX.Element }) {
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuth({ children }: { children: JSX.Element }) {
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  if (accessToken) return <Navigate to="/home" replace />;
  return children;
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/home" replace /> },
  { path: '/login',            element: page(<RedirectIfAuth><LoginPage /></RedirectIfAuth>) },
  { path: '/signup',           element: page(<RedirectIfAuth><SignupPage /></RedirectIfAuth>) },
  { path: '/forgot-password',      element: page(<RedirectIfAuth><ForgotPasswordPage /></RedirectIfAuth>) },
  { path: '/reset-password',       element: page(<ResetPasswordPage />) },
  { path: '/verify-email',         element: page(<VerifyEmailPage />) },
  { path: '/resend-verification',  element: page(<ResendVerificationPage />) },
  { path: '/posts/:slug',  element: page(<PostDetailPage />) },
  { path: '/quiz/play/:quizId', element: page(<RequireAuth><QuizPlayPage /></RequireAuth>) },
  {
    path: '/',
    element: <NavOnlyLayout />,
    children: [
      { path: 'practice', element: page(<RequireAuth><PracticeQuizPage /></RequireAuth>) },
    ],
  },
  { path: '/quiz/result',       element: page(<RequireAuth><QuizResultPage /></RequireAuth>) },
  { path: '/quiz/create',       element: page(<RequireAuth><CreateQuizPage /></RequireAuth>) },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: 'home',          element: page(<HomePage />) },
      { path: 'quizzes',       element: page(<QuizzesPage />) },
      // Public info pages (linked from the bottom of the left menu)
      { path: 'about',          element: page(<AboutPage />) },
      { path: 'privacy-policy', element: page(<PrivacyPolicyPage />) },
      { path: 'contact',        element: page(<ContactPage />) },
      { path: 'friends',       element: page(<RequireAuth><FriendsPage /></RequireAuth>) },
      { path: 'messages',      element: page(<RequireAuth><MessagesPage /></RequireAuth>) },
      { path: 'leaderboard',   element: page(<RequireAuth><LeaderboardPage /></RequireAuth>) },
      { path: 'profile',           element: page(<RequireAuth><ProfilePage /></RequireAuth>) },
      { path: 'profile/:userId',   element: page(<RequireAuth><UserProfilePage /></RequireAuth>) },
      { path: 'posts',         element: page(<RequireAuth><PostsPage /></RequireAuth>) },
      { path: 'history',       element: page(<RequireAuth><HistoryPage /></RequireAuth>) },
      { path: 'notifications',  element: page(<RequireAuth><NotificationsPage /></RequireAuth>) },
      { path: 'settings',      element: page(<RequireAuth><SettingsPage /></RequireAuth>) },
      { path: 'admin',         element: page(<RequireAuth><AdminDashboard /></RequireAuth>) },
    ],
  },
]);
