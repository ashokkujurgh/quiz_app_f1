import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { QuizzesStackParamList } from '../../navigation/types';
import * as quizzesApi from '../../api/services/quizzes';
import { useAppSelector } from '../../store/hooks';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import GradientText from '../../components/ui/GradientText';
import LetterAvatar from '../../components/ui/LetterAvatar';
import Card from '../../components/ui/Card';
import GradientButton from '../../components/ui/GradientButton';
import type { LeaderboardEntry } from '../../types';

type Props = NativeStackScreenProps<QuizzesStackParamList, 'QuizResult'>;

export default function QuizResultScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { quizId } = route.params;
  // Socket-driven leaderboard (populated by a live game_over event, if we came straight from QuizPlay).
  const socketLeaderboard = useAppSelector((s) => s.quiz.leaderboard);
  const myId = useAppSelector((s) => s.auth.user?._id);
  const [myScore, setMyScore] = useState<{ score: number; total: number; percentage: number } | null>(null);
  const [fetchedLeaderboard, setFetchedLeaderboard] = useState<LeaderboardEntry[]>([]);

  const leaderboard = socketLeaderboard.length > 0 ? socketLeaderboard : fetchedLeaderboard;

  useEffect(() => {
    quizzesApi
      .fetchMyQuizHistory(quizId)
      .then((res) => setMyScore(res.history))
      .catch(() => undefined);
    // REST fallback for when this screen is opened directly (e.g. "View Results" on a
    // completed quiz) rather than reached via a live game_over socket event.
    if (socketLeaderboard.length === 0) {
      quizzesApi
        .fetchQuizLeaderboard(quizId)
        .then((res) => setFetchedLeaderboard(res.leaderboard))
        .catch(() => undefined);
    }
  }, [quizId]);

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <Trophy size={32} color={colors.primary} />
          <GradientText style={styles.percentage}>{myScore ? `${Math.round(myScore.percentage)}%` : '—'}</GradientText>
          <Text style={styles.scoreLine}>{myScore ? `${myScore.score} / ${myScore.total} correct` : 'Calculating your score…'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Leaderboard</Text>
        <Card style={styles.leaderboardCard}>
          {leaderboard.length === 0 ? (
            <Text style={styles.emptyText}>Leaderboard will appear here.</Text>
          ) : (
            leaderboard.map((row) => (
              <View key={row.userId} style={[styles.row, row.userId === myId && styles.rowMe]}>
                <Text style={styles.rank}>#{row.rank}</Text>
                <LetterAvatar name={row.userName} uri={row.userAvatar} size={32} />
                <Text style={styles.rowName} numberOfLines={1}>
                  {row.userName}
                </Text>
                <Text style={styles.rowScore}>{row.score}</Text>
              </View>
            ))
          )}
        </Card>

        <GradientButton title="Back to Quizzes" onPress={() => navigation.popToTop()} style={styles.cta} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  hero: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  percentage: { fontFamily: fonts.headingBlack, fontSize: 44 },
  scoreLine: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.mutedForeground },
  sectionTitle: { fontFamily: fonts.headingSemiBold, fontSize: 14, color: colors.foreground },
  leaderboardCard: { padding: 8 },
  emptyText: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.mutedForeground, padding: 16, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md },
  rowMe: { backgroundColor: colors.softPrimaryBg },
  rank: { fontFamily: fonts.headingBold, fontSize: 12, color: colors.mutedForeground, width: 28 },
  rowName: { flex: 1, fontFamily: fonts.headingSemiBold, fontSize: 13, color: colors.foreground },
  rowScore: { fontFamily: fonts.headingBold, fontSize: 13, color: colors.primary },
  cta: { marginTop: 8, width: '100%' },
});
