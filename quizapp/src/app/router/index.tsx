import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../components/pages/LoginPage';
import { SignupPage } from '../components/pages/SignupPage';
import { HomePage } from '../components/pages/HomePage';
import { QuizzesPage } from '../components/pages/QuizzesPage';
import { QuizPlayPage } from '../components/pages/QuizPlayPage';
import { QuizResultPage } from '../components/pages/QuizResultPage';
import { FriendsPage } from '../components/pages/FriendsPage';
import { MessagesPage } from '../components/pages/MessagesPage';
import { LeaderboardPage } from '../components/pages/LeaderboardPage';
import { ProfilePage } from '../components/pages/ProfilePage';
import { HistoryPage } from '../components/pages/HistoryPage';
import { NotificationsPage } from '../components/pages/NotificationsPage';
import { SettingsPage } from '../components/pages/SettingsPage';
import { AdminDashboard } from '../components/pages/AdminDashboard';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: 'home', element: <HomePage /> },
      { path: 'quizzes', element: <QuizzesPage /> },
      { path: 'quiz/play', element: <QuizPlayPage /> },
      { path: 'quiz/result', element: <QuizResultPage /> },
      { path: 'friends', element: <FriendsPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'admin', element: <AdminDashboard /> },
    ],
  },
]);
