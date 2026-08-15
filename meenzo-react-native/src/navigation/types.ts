import type { Question } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  CheckYourEmail: { email: string };
  ForgotPassword: undefined;
};

export type HomeStackParamList = {
  HomeFeed: undefined;
  CreatePost: undefined;
  PostDetail: { postId: string };
  Notifications: undefined;
};

export type QuizzesStackParamList = {
  QuizzesList: undefined;
  QuizPlay: { quizId: string };
  QuizResult: { quizId: string };
  QuizHistory: { highlightQuizId?: string };
  PracticeQuiz: { quizTitle: string; questions: Question[] };
  CreateQuiz: undefined;
};

export type FriendsStackParamList = {
  FriendsList: undefined;
  UserProfile: { userId: string };
};

export type MessagesStackParamList = {
  ConversationsList: undefined;
  Chat: {
    conversationId: string;
    otherUserName: string;
    otherUserAvatar?: string | null;
    otherUserId?: string;
    isGroup?: boolean;
  };
  UserProfile: { userId: string };
  CreateGroup: undefined;
  GroupInfo: { conversationId: string };
  AddGroupMembers: { conversationId: string; existingMemberIds: string[] };
};

export type ProfileStackParamList = {
  MyProfile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Leaderboard: undefined;
};

export type MainTabParamList = {
  HomeStack: undefined;
  QuizzesStack: undefined;
  FriendsStack: undefined;
  MessagesStack: undefined;
  ProfileStack: undefined;
};
