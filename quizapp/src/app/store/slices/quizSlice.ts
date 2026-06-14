import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Quiz, QuizResult } from '../../types';

interface QuizState {
  quizzes: Quiz[];
  activeQuiz: Quiz | null;
  currentQuestion: number;
  answers: number[];
  timeLeft: number;
  quizStarted: boolean;
  quizCompleted: boolean;
  result: QuizResult | null;
}

const initialState: QuizState = {
  quizzes: [],
  activeQuiz: null,
  currentQuestion: 0,
  answers: [],
  timeLeft: 0,
  quizStarted: false,
  quizCompleted: false,
  result: null,
};

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    startQuiz: (state, action: PayloadAction<Quiz>) => {
      state.activeQuiz = action.payload;
      state.currentQuestion = 0;
      state.answers = new Array(action.payload.questions.length).fill(-1);
      state.timeLeft = action.payload.duration;
      state.quizStarted = true;
      state.quizCompleted = false;
      state.result = null;
    },
    answerQuestion: (state, action: PayloadAction<{ questionIndex: number; answer: number }>) => {
      state.answers[action.payload.questionIndex] = action.payload.answer;
    },
    nextQuestion: (state) => {
      if (state.activeQuiz && state.currentQuestion < state.activeQuiz.questions.length - 1) {
        state.currentQuestion += 1;
      }
    },
    prevQuestion: (state) => {
      if (state.currentQuestion > 0) {
        state.currentQuestion -= 1;
      }
    },
    tickTimer: (state) => {
      if (state.timeLeft > 0) state.timeLeft -= 1;
    },
    completeQuiz: (state) => {
      if (!state.activeQuiz) return;
      const score = state.answers.filter(
        (ans, i) => ans === state.activeQuiz!.questions[i]?.correctAnswer
      ).length;
      const total = state.activeQuiz.questions.length;
      state.result = {
        quizId: state.activeQuiz.id,
        quizTitle: state.activeQuiz.title,
        category: state.activeQuiz.category,
        score,
        total,
        percentage: total > 0 ? Math.round((score / total) * 100) : 0,
        rank: undefined,
        duration: state.activeQuiz.duration - state.timeLeft,
        date: new Date().toISOString().split('T')[0],
        answers: state.answers,
      };
      state.quizCompleted = true;
      state.quizStarted = false;
    },
    resetQuiz: (state) => {
      state.activeQuiz = null;
      state.currentQuestion = 0;
      state.answers = [];
      state.timeLeft = 0;
      state.quizStarted = false;
      state.quizCompleted = false;
      state.result = null;
    },
  },
});

export const { startQuiz, answerQuestion, nextQuestion, prevQuestion, tickTimer, completeQuiz, resetQuiz } = quizSlice.actions;
export default quizSlice.reducer;
