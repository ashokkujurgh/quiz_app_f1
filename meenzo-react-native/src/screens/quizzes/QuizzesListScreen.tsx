import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HelpCircle, Trophy, Mail, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRAD, GRAD_LOCATIONS, DIAGONAL_START, DIAGONAL_END } from '../../theme/gradients';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { QuizzesStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchActiveAndUpcoming, fetchPastQuizzes, fetchMyInvited } from '../../store/slices/quizSlice';
import * as quizzesApi from '../../api/services/quizzes';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import SearchBar from '../../components/ui/SearchBar';
import QuizCard from '../../components/quizzes/QuizCard';
import EmptyState from '../../components/ui/EmptyState';
import type { Quiz } from '../../types';

type Props = NativeStackScreenProps<QuizzesStackParamList, 'QuizzesList'>;

const TABS = [
  { key: 'active', label: 'Active & Upcoming', icon: HelpCircle },
  { key: 'past', label: 'Past Quizzes', icon: Trophy },
  { key: 'invites', label: 'My Invites', icon: Mail },
] as const;

export default function QuizzesListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { activeAndUpcoming, pastQuizzes, invited, loadingActive, loadingPast, loadingInvited } = useAppSelector((s) => s.quiz);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [testLoadingId, setTestLoadingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchActiveAndUpcoming());
  }, [dispatch]);

  useEffect(() => {
    // Re-fetch whenever this screen regains focus (e.g. returning from CreateQuiz)
    // so a just-created quiz shows up without a manual pull-to-refresh.
    const unsub = navigation.addListener('focus', () => {
      dispatch(fetchActiveAndUpcoming());
    });
    return unsub;
  }, [navigation, dispatch]);

  useEffect(() => {
    if (tab === 1 && pastQuizzes.length === 0) dispatch(fetchPastQuizzes());
    if (tab === 2 && invited.length === 0) dispatch(fetchMyInvited());
  }, [tab, dispatch]);

  const data = tab === 0 ? activeAndUpcoming : tab === 1 ? pastQuizzes : invited;
  const loading = tab === 0 ? loadingActive : tab === 1 ? loadingPast : loadingInvited;
  const filtered = data.filter((q) => !search || q.title.toLowerCase().includes(search.toLowerCase()));

  const onOpenQuiz = (quiz: Quiz) => {
    if (quiz.status === 'active') navigation.navigate('QuizPlay', { quizId: quiz._id });
    // scheduled/invited quizzes: nothing to join yet, card is informational until it goes live
  };

  const onPlayAsTest = async (quiz: Quiz) => {
    setTestLoadingId(quiz._id);
    try {
      const res = await quizzesApi.fetchQuizQuestions(quiz._id);
      if (res.questions.length === 0) return;
      navigation.navigate('PracticeQuiz', { quizTitle: quiz.title, questions: res.questions });
    } catch {
      // silently ignore — card stays interactive for retry
    } finally {
      setTestLoadingId(null);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quizzes</Text>
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('CreateQuiz')}>
          <LinearGradient colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.createBtn}>
            <Plus size={14} color="#fff" />
            <Text style={styles.createBtnText}>Create Quiz</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar placeholder="Search quizzes…" value={search} onChangeText={setSearch} />
      </View>

      <ScrollView
        horizontal
        style={styles.tabRowOuter}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {TABS.map((t, i) => {
          const active = tab === i;
          const Icon = t.icon;
          return (
            <TouchableOpacity key={t.key} style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={() => setTab(i)}>
              <Icon size={13} color={active ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && data.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <QuizCard
              quiz={item}
              onPress={() => onOpenQuiz(item)}
              onGameHistory={() => navigation.navigate('QuizHistory', { highlightQuizId: item._id })}
              onPlayAsTest={() => onPlayAsTest(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={tab === 0 ? HelpCircle : tab === 1 ? Trophy : Mail}
              title={tab === 0 ? 'No active or upcoming quizzes' : tab === 1 ? 'No past quizzes yet' : 'No invites yet'}
              subtitle={
                tab === 0
                  ? 'Check back soon for new quizzes to play.'
                  : tab === 1
                    ? 'Completed quizzes will show up here.'
                    : "You'll see quizzes you're invited to here."
              }
            />
          }
        />
      )}
      {testLoadingId ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  headerTitle: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.foreground },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  createBtnText: { fontFamily: fonts.headingBold, fontSize: 12, color: '#fff' },
  searchWrap: { paddingHorizontal: 20, marginBottom: 12 },
  // Horizontal ScrollView must not grow along the main (vertical) axis of its column
  // parent, or its row children stretch to fill all remaining screen height (huge ovals).
  tabRowOuter: { flexGrow: 0, flexShrink: 0 },
  tabRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 14 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.chipBorder },
  tabBtnActive: { backgroundColor: colors.softPrimaryBg, borderColor: colors.primary },
  tabText: { fontFamily: fonts.headingSemiBold, fontSize: 12, color: colors.mutedForeground },
  tabTextActive: { color: colors.primary },
  gridContent: { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },
  column: { gap: 12 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(245,244,252,0.6)', alignItems: 'center', justifyContent: 'center' },
});
