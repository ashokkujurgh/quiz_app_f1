import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, HelpCircle, History as HistoryIcon } from 'lucide-react-native';
import type { Quiz } from '../../types';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { GRAD, GRAD_LOCATIONS, DIAGONAL_START, DIAGONAL_END } from '../../theme/gradients';
import { formatDuration } from '../../utils/formatDuration';
import Card from '../ui/Card';

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  Easy: { bg: 'rgba(34,197,94,0.15)', text: '#16a34a' },
  Medium: { bg: 'rgba(245,158,11,0.15)', text: '#b45309' },
  Hard: { bg: 'rgba(239,68,68,0.15)', text: '#dc2626' },
};

function normalizeDifficulty(d?: string): 'Easy' | 'Medium' | 'Hard' {
  const v = (d ?? 'medium').toLowerCase();
  if (v === 'easy') return 'Easy';
  if (v === 'hard') return 'Hard';
  return 'Medium';
}

interface Props {
  quiz: Quiz;
  onPress: () => void;
  onGameHistory?: () => void;
  onPlayAsTest?: () => void;
}

export default function QuizCard({ quiz, onPress, onGameHistory, onPlayAsTest }: Props) {
  const isPast = quiz.status === 'completed';
  const isLive = quiz.status === 'active';
  const isScheduled = quiz.status === 'scheduled';
  const difficulty = normalizeDifficulty(quiz.difficulty);
  const diffColors = DIFFICULTY_COLORS[difficulty];

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.touchable} disabled={isPast}>
      <Card style={styles.card}>
        <LinearGradient colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.cover}>
          <View style={styles.coverIconBox}>
            <HelpCircle size={24} color="#fff" />
          </View>
          <View style={styles.badgeRow}>
            {isLive ? (
              <View style={[styles.badge, styles.liveBadge]}>
                <View style={styles.liveDot} />
                <Text style={[styles.badgeText, { color: colors.liveBadgeText }]}>Live Now</Text>
              </View>
            ) : null}
            {isScheduled ? (
              <View style={[styles.badge, styles.scheduledBadge]}>
                <Text style={[styles.badgeText, { color: '#0369a1' }]}>Scheduled</Text>
              </View>
            ) : null}
            {isPast ? (
              <View style={[styles.badge, styles.endedBadge]}>
                <Text style={[styles.badgeText, { color: colors.endedBadgeText }]}>Ended</Text>
              </View>
            ) : null}
          </View>
          {quiz.participation === 'invite_only' ? (
            <View style={[styles.badge, styles.inviteBadge, styles.badgeTopRight]}>
              <Text style={[styles.badgeText, { color: '#7c3aed' }]}>Invite Only</Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.info}>
          <View style={[styles.badge, { backgroundColor: diffColors.bg, alignSelf: 'flex-start' }]}>
            <Text style={[styles.badgeText, { color: diffColors.text }]}>{difficulty}</Text>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {quiz.title}
          </Text>

          {isScheduled && quiz.scheduledAt ? (
            <Text style={styles.timeLine} numberOfLines={1}>
              Starts {new Date(quiz.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
          ) : null}
          {isLive && quiz.startedAt ? (
            <Text style={[styles.timeLine, { color: colors.liveBadgeText }]} numberOfLines={1}>
              Started {new Date(quiz.startedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={10} color={colors.mutedForeground} />
              <Text style={styles.metaText}>{formatDuration(quiz.durationMinutes)}</Text>
            </View>
            <View style={styles.metaItem}>
              <HelpCircle size={10} color={colors.mutedForeground} />
              <Text style={styles.metaText}>{quiz.questionCount ?? '?'} questions</Text>
            </View>
          </View>

          {isPast ? (
            <View style={styles.pastActions}>
              <TouchableOpacity style={styles.historyBtn} onPress={onGameHistory}>
                <HistoryIcon size={11} color={colors.primary} />
                <Text style={styles.historyBtnText}>Game History</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onPlayAsTest}>
                <LinearGradient colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.testBtn}>
                  <Text style={styles.testBtnText}>Play as Test</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <LinearGradient colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.ctaBtn}>
              <Text style={styles.ctaTextLive}>{isLive ? 'Join Now' : 'View Details'}</Text>
            </LinearGradient>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: { flex: 1 },
  card: { flex: 1 },
  cover: { height: 100, alignItems: 'center', justifyContent: 'center' },
  coverIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  badgeRow: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 4 },
  badgeTopRight: { position: 'absolute', top: 10, right: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  liveBadge: { backgroundColor: colors.liveBadgeBg, borderWidth: 1, borderColor: colors.liveBadgeBorder },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.liveBadgeText },
  scheduledBadge: { backgroundColor: 'rgba(14,165,233,0.2)', borderWidth: 1, borderColor: 'rgba(14,165,233,0.4)' },
  endedBadge: { backgroundColor: colors.endedBadgeBg, borderWidth: 1, borderColor: colors.endedBadgeBorder },
  inviteBadge: { backgroundColor: 'rgba(124,58,237,0.2)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)' },
  badgeText: { fontFamily: fonts.headingBold, fontSize: 9 },
  info: { padding: 12, gap: 5 },
  title: { fontFamily: fonts.headingBold, fontSize: 12, color: colors.foreground, lineHeight: 16 },
  timeLine: { fontFamily: fonts.bodyMedium, fontSize: 10, color: '#0369a1' },
  metaRow: { flexDirection: 'row', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.mutedForeground },
  ctaBtn: { marginTop: 4, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  ctaTextLive: { fontFamily: fonts.headingBold, fontSize: 11, color: '#fff' },
  pastActions: { marginTop: 4, gap: 6 },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  historyBtnText: { fontFamily: fonts.headingBold, fontSize: 11, color: colors.primary },
  testBtn: { borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  testBtnText: { fontFamily: fonts.headingBold, fontSize: 11, color: '#fff' },
});
