import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trophy } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import * as quizzesApi from '../../api/services/quizzes';
import { useAppSelector } from '../../store/hooks';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import LetterAvatar from '../../components/ui/LetterAvatar';
import EmptyState from '../../components/ui/EmptyState';
import type { LeaderboardEntry } from '../../types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Leaderboard'>;

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const myId = useAppSelector((s) => s.auth.user?._id);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quizzesApi
      .fetchGlobalLeaderboard()
      .then((res) => setEntries(res.leaderboard))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, i) => `${item.userId}-${i}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.row, item.userId === myId && styles.rowMe]}>
              <View style={styles.rankWrap}>
                {RANK_MEDAL[item.rank] ? (
                  <Text style={styles.medal}>{RANK_MEDAL[item.rank]}</Text>
                ) : (
                  <Text style={styles.rank}>#{item.rank}</Text>
                )}
              </View>
              <LetterAvatar name={item.userName} uri={item.userAvatar} size={38} />
              <Text style={styles.name} numberOfLines={1}>
                {item.userName}
                {item.userId === myId ? ' (You)' : ''}
              </Text>
              <Text style={styles.score}>{item.score} pts</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={<EmptyState icon={Trophy} title="No rankings yet" subtitle="Play some quizzes to appear on the leaderboard." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.softPrimaryBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.foreground },
  listContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  rowMe: { backgroundColor: colors.softPrimaryBg, borderColor: colors.borderStrong },
  rankWrap: { width: 30, alignItems: 'center' },
  medal: { fontSize: 18 },
  rank: { fontFamily: fonts.headingBold, fontSize: 13, color: colors.mutedForeground },
  name: { flex: 1, fontFamily: fonts.headingSemiBold, fontSize: 13, color: colors.foreground },
  score: { fontFamily: fonts.headingBold, fontSize: 13, color: colors.primary },
});
