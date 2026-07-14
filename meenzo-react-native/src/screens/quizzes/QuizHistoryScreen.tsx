import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, History } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { QuizzesStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMyHistory } from '../../store/slices/quizSlice';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';

type Props = NativeStackScreenProps<QuizzesStackParamList, 'QuizHistory'>;

export default function QuizHistoryScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { myHistory } = useAppSelector((s) => s.quiz);
  const highlightQuizId = route.params?.highlightQuizId;
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    dispatch(fetchMyHistory());
  }, [dispatch]);

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Game History</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        ref={listRef}
        data={myHistory}
        keyExtractor={(item, i) => `${item.quizId}-${i}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card style={[styles.row, item.quizId === highlightQuizId && styles.rowHighlighted]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {item.quizTitle ?? 'Quiz'}
              </Text>
              {item.playedAt ? <Text style={styles.date}>{new Date(item.playedAt).toLocaleDateString()}</Text> : null}
            </View>
            <Text style={styles.score}>
              {item.score}/{item.total}
            </Text>
            <Text style={styles.percentage}>{Math.round(item.percentage)}%</Text>
          </Card>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<EmptyState icon={History} title="No quiz results yet" subtitle="Take your first quiz to see results here." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.softPrimaryBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.headingBold, fontSize: 15, color: colors.foreground },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowHighlighted: { borderColor: colors.primary, borderWidth: 1.5 },
  title: { fontFamily: fonts.headingSemiBold, fontSize: 13, color: colors.foreground },
  date: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  score: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.mutedForeground },
  percentage: { fontFamily: fonts.headingBold, fontSize: 13, color: colors.primary, minWidth: 44, textAlign: 'right' },
});
