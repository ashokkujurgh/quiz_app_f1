import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { QuizzesStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  joinGame,
  gameStarted,
  questionReceived,
  tickTimer,
  answerSelected,
  questionEnded,
  leaderboardUpdated,
  gameOver,
  gameErrored,
  resetGame,
} from '../../store/slices/quizSlice';
import { useQuizSocket } from '../../sockets/useQuizSocket';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { GRAD, GRAD_LOCATIONS, DIAGONAL_START, DIAGONAL_END } from '../../theme/gradients';
import { radius } from '../../theme/spacing';

type Props = NativeStackScreenProps<QuizzesStackParamList, 'QuizPlay'>;

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function QuizPlayScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { quizId } = route.params;
  const token = useAppSelector((s) => s.auth.accessToken);
  const user = useAppSelector((s) => s.auth.user);
  const { gameState, currentQuestion, timeLeft, selectedAnswer, correctOption, gameError } = useAppSelector((s) => s.quiz);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { submitAnswer } = useQuizSocket(quizId, token, user?.name ?? 'Player', user?.avatar ?? undefined, {
    onGameStarted: () => dispatch(gameStarted()),
    onQuestion: (e) =>
      dispatch(
        questionReceived({
          questionIndex: e.questionIndex,
          questionId: e.questionId,
          question: e.question,
          options: e.options,
          timeLimit: e.timeLimit,
          total: e.total,
        }),
      ),
    onQuestionEnded: (e) => dispatch(questionEnded({ correctOption: Number(e.correctOption) })),
    onGameOver: (e) => {
      dispatch(
        gameOver(
          e.leaderboard.map((row) => ({
            rank: row.rank,
            userId: row.userId,
            userName: row.userName,
            userAvatar: row.userAvatar,
            score: row.score,
          })),
        ),
      );
      navigation.replace('QuizResult', { quizId });
    },
    onLeaderboardUpdate: (e) =>
      dispatch(
        leaderboardUpdated(
          e.scores.map((s, i) => ({ rank: i + 1, userId: s.userId, userName: s.userName, userAvatar: s.userAvatar, score: s.score })),
        ),
      ),
    onGameError: (e) => dispatch(gameErrored(e.message)),
  });

  useEffect(() => {
    dispatch(joinGame(quizId));
    return () => {
      dispatch(resetGame());
    };
  }, [dispatch, quizId]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (currentQuestion && timeLeft > 0 && correctOption === null) {
      timerRef.current = setInterval(() => dispatch(tickTimer()), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestion, timeLeft > 0, correctOption, dispatch]);

  const onSelect = (index: number) => {
    if (!currentQuestion || selectedAnswer !== null) return;
    dispatch(answerSelected(index));
    submitAnswer(currentQuestion.questionId, currentQuestion.questionIndex, index);
  };

  if (gameError) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{gameError}</Text>
      </View>
    );
  }

  if (gameState === 'lobby' || !currentQuestion) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.waitingText}>Waiting for the quiz to start…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.progress}>
          Question {currentQuestion.questionIndex + 1} / {currentQuestion.total}
        </Text>
        <View style={styles.timerPill}>
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
      </View>

      <View style={styles.options}>
        {currentQuestion.options.map((opt, i) => {
          const isSelected = selectedAnswer === i;
          const isCorrect = correctOption !== null && correctOption === i;
          const isWrongSelected = correctOption !== null && isSelected && correctOption !== i;

          const content = (
            <View style={styles.optionInner}>
              <View style={[styles.optionLetter, isSelected && !correctOption ? styles.optionLetterActive : null]}>
                <Text style={[styles.optionLetterText, isSelected ? { color: '#fff' } : null]}>{OPTION_LETTERS[i]}</Text>
              </View>
              <Text style={styles.optionText}>{opt}</Text>
            </View>
          );

          if (isCorrect) {
            return (
              <LinearGradient key={i} colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.option}>
                {content}
              </LinearGradient>
            );
          }

          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.85}
              style={[styles.option, styles.optionCard, isWrongSelected && styles.optionWrong]}
              onPress={() => onSelect(i)}
              disabled={selectedAnswer !== null}
            >
              {content}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  waitingText: { fontFamily: fonts.headingSemiBold, fontSize: 15, color: colors.mutedForeground, textAlign: 'center' },
  errorText: { fontFamily: fonts.headingSemiBold, fontSize: 15, color: colors.destructive, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  progress: { fontFamily: fonts.headingSemiBold, fontSize: 13, color: colors.mutedForeground },
  timerPill: { backgroundColor: colors.softPrimaryBg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  timerText: { fontFamily: fonts.headingBold, fontSize: 13, color: colors.primary },
  questionCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 20, marginBottom: 20 },
  questionText: { fontFamily: fonts.headingBold, fontSize: 17, color: colors.foreground, lineHeight: 24 },
  options: { gap: 12 },
  option: { borderRadius: radius.md, padding: 16 },
  optionCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  optionWrong: { borderColor: colors.destructive, backgroundColor: 'rgba(212,24,61,0.08)' },
  optionInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionLetter: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  optionLetterActive: { backgroundColor: colors.primary },
  optionLetterText: { fontFamily: fonts.headingBold, fontSize: 12, color: colors.foreground },
  optionText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.foreground },
});
