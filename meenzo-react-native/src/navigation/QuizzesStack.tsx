import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { QuizzesStackParamList } from './types';
import QuizzesListScreen from '../screens/quizzes/QuizzesListScreen';
import QuizPlayScreen from '../screens/quizzes/QuizPlayScreen';
import QuizResultScreen from '../screens/quizzes/QuizResultScreen';
import QuizHistoryScreen from '../screens/quizzes/QuizHistoryScreen';
import PracticeQuizScreen from '../screens/quizzes/PracticeQuizScreen';
import CreateQuizScreen from '../screens/quizzes/CreateQuizScreen';

const Stack = createNativeStackNavigator<QuizzesStackParamList>();

export default function QuizzesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="QuizzesList" component={QuizzesListScreen} />
      <Stack.Screen name="QuizPlay" component={QuizPlayScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="QuizResult" component={QuizResultScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="QuizHistory" component={QuizHistoryScreen} />
      <Stack.Screen name="PracticeQuiz" component={PracticeQuizScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="CreateQuiz" component={CreateQuizScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
