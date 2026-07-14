import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Minus, Plus, Check } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { QuizzesStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAllFriendData } from '../../store/slices/friendsSlice';
import * as topicsApi from '../../api/services/topics';
import * as quizzesApi from '../../api/services/quizzes';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import ChipTabRow from '../../components/ui/ChipTabRow';
import SegmentedTabs from '../../components/ui/SegmentedTabs';
import GradientButton from '../../components/ui/GradientButton';
import LetterAvatar from '../../components/ui/LetterAvatar';
import type { Topic, SubTopic } from '../../types';

type Props = NativeStackScreenProps<QuizzesStackParamList, 'CreateQuiz'>;

const PARTICIPATION = ['Public', 'Private', 'Invite Only'];
const PARTICIPATION_VALUES = ['public', 'private', 'invite_only'] as const;
const DURATION_PRESETS = [10, 20, 30, 45, 60];
const TIME_LIMIT_PRESETS = [15, 20, 30, 45];
const SCHEDULE_PRESETS = [
  { label: 'Now', minutesFromNow: 1 },
  { label: 'In 15 min', minutesFromNow: 15 },
  { label: 'In 1 hour', minutesFromNow: 60 },
  { label: 'Tomorrow', minutesFromNow: 60 * 24 },
];

function Stepper({ value, onChange, min = 1, max = 50, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepperBtn} onPress={() => onChange(Math.max(min, value - step))}>
        <Minus size={14} color={colors.primary} />
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value}</Text>
      <TouchableOpacity style={styles.stepperBtn} onPress={() => onChange(Math.min(max, value + step))}>
        <Plus size={14} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

export default function CreateQuizScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const friends = useAppSelector((s) => s.friends.friends);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  const [topicIndex, setTopicIndex] = useState(0);
  const [subTopicIndex, setSubTopicIndex] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [timeLimitPerQuestion, setTimeLimitPerQuestion] = useState(20);
  const [scheduleIndex, setScheduleIndex] = useState(0);
  const [participationIndex, setParticipationIndex] = useState(0);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    topicsApi.fetchTopics().then((res) => setTopics(res.topics)).catch(() => undefined);
    dispatch(fetchAllFriendData());
  }, [dispatch]);

  useEffect(() => {
    const topic = topics[topicIndex];
    if (!topic) return;
    setSubTopicIndex(null);
    topicsApi
      .fetchSubTopics(topic._id)
      .then((res) => setSubTopics(res.subtopics))
      .catch(() => setSubTopics([]));
  }, [topics, topicIndex]);

  const participation = PARTICIPATION_VALUES[participationIndex];

  const toggleInvite = (userId: string) => {
    setInvitedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const scheduledAtIso = useMemo(() => {
    const preset = SCHEDULE_PRESETS[scheduleIndex];
    return new Date(Date.now() + preset.minutesFromNow * 60000).toISOString();
  }, [scheduleIndex]);

  const canSubmit = title.trim().length > 0 && topics[topicIndex] && !submitting;

  const onSubmit = async () => {
    if (!canSubmit || !user) return;
    setError(null);
    setSubmitting(true);
    try {
      await quizzesApi.createQuiz({
        title: title.trim(),
        description: description.trim() || undefined,
        questionCount,
        selectionMode: 'random',
        topic: topics[topicIndex]._id,
        subTopic: subTopicIndex !== null ? subTopics[subTopicIndex]?._id : undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        scheduledAt: scheduledAtIso,
        durationMinutes,
        timeLimitPerQuestion,
        participation,
        allowedUsers: participation === 'invite_only' ? Array.from(invitedIds) : undefined,
      });
      // Quiz starts as 'scheduled' until the backend's scheduler flips it to 'active' at
      // scheduledAt — go back to the list rather than assuming it's immediately joinable.
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message ?? 'Could not create quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Quiz</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} placeholder="e.g. Daily Science Quiz" placeholderTextColor={colors.mutedForeground} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What's this quiz about?"
          placeholderTextColor={colors.mutedForeground}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        {topics.length > 0 ? (
          <>
            <Text style={styles.label}>Topic</Text>
            <ChipTabRow items={topics.map((t) => t.name)} activeIndex={topicIndex} onChange={setTopicIndex} />
          </>
        ) : null}

        {subTopics.length > 0 ? (
          <>
            <Text style={styles.label}>Subtopic (optional)</Text>
            <ChipTabRow
              items={['Any', ...subTopics.map((s) => s.name)]}
              activeIndex={subTopicIndex === null ? 0 : subTopicIndex + 1}
              onChange={(i) => setSubTopicIndex(i === 0 ? null : i - 1)}
            />
          </>
        ) : null}

        <Text style={styles.label}>Number of Questions</Text>
        <Stepper value={questionCount} onChange={setQuestionCount} min={5} max={50} step={5} />

        <Text style={styles.label}>Duration</Text>
        <ChipTabRow
          items={DURATION_PRESETS.map((m) => `${m} min`)}
          activeIndex={DURATION_PRESETS.indexOf(durationMinutes)}
          onChange={(i) => setDurationMinutes(DURATION_PRESETS[i])}
        />

        <Text style={styles.label}>Time per Question</Text>
        <ChipTabRow
          items={TIME_LIMIT_PRESETS.map((s) => `${s}s`)}
          activeIndex={TIME_LIMIT_PRESETS.indexOf(timeLimitPerQuestion)}
          onChange={(i) => setTimeLimitPerQuestion(TIME_LIMIT_PRESETS[i])}
        />

        <Text style={styles.label}>Schedule</Text>
        <ChipTabRow items={SCHEDULE_PRESETS.map((p) => p.label)} activeIndex={scheduleIndex} onChange={setScheduleIndex} />

        <Text style={styles.label}>Who can join</Text>
        <SegmentedTabs items={PARTICIPATION} activeIndex={participationIndex} onChange={setParticipationIndex} />

        {participation === 'invite_only' ? (
          <View style={styles.inviteSection}>
            <Text style={styles.label}>Invite Friends</Text>
            {friends.length === 0 ? (
              <Text style={styles.hint}>Add some friends first to invite them.</Text>
            ) : (
              <View style={styles.friendGrid}>
                {friends
                  .filter((f) => !!f?._id)
                  .map((f) => {
                    const selected = invitedIds.has(f._id);
                    return (
                      <TouchableOpacity key={f._id} style={[styles.friendChip, selected && styles.friendChipSelected]} onPress={() => toggleInvite(f._id)}>
                        <LetterAvatar name={f.name} uri={f.avatar} size={24} />
                        <Text style={[styles.friendChipText, selected && styles.friendChipTextSelected]} numberOfLines={1}>
                          {f.name}
                        </Text>
                        {selected ? <Check size={12} color="#fff" /> : null}
                      </TouchableOpacity>
                    );
                  })}
              </View>
            )}
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <GradientButton title={submitting ? 'Creating…' : 'Create Quiz'} onPress={onSubmit} disabled={!canSubmit} style={{ width: '100%' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.foreground },
  body: { paddingHorizontal: 20, paddingBottom: 20 },
  label: { fontFamily: fonts.headingSemiBold, fontSize: 12, color: colors.foreground, marginTop: 16, marginBottom: 8 },
  hint: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.mutedForeground },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.foreground,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16, alignSelf: 'flex-start' },
  stepperBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.softPrimaryBg, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.foreground, minWidth: 28, textAlign: 'center' },
  inviteSection: { marginTop: 4 },
  friendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    maxWidth: 150,
  },
  friendChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  friendChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.foreground, flexShrink: 1 },
  friendChipTextSelected: { color: '#fff' },
  error: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.destructive, marginTop: 16 },
  footer: { padding: 20 },
});
