import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Trophy, Users, Timer } from 'lucide-react-native';
import type { QuizResult } from '../../types';
import { fonts } from '../../theme/typography';

const MEDAL = ['🥇', '🥈', '🥉'];
const INITIAL_SHOW = 5;
const GOLD = '#FFD700';

interface Props {
  result: QuizResult;
  isAdmin: boolean;
}

export default function QuizResultCard({ result, isAdmin }: Props) {
  const [expanded, setExpanded] = useState(false);
  const durationMin = Math.round((result.duration ?? 0) / 60);

  if (isAdmin) {
    const allPlayers = result.topPlayers ?? [];
    const visiblePlayers = expanded ? allPlayers : allPlayers.slice(0, INITIAL_SHOW);
    const hasMore = allPlayers.length > INITIAL_SHOW;

    return (
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.wrap}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Trophy size={18} color={GOLD} />
            <Text style={styles.headerLabel}>Quiz Completed</Text>
          </View>
          <Text style={styles.quizTitle}>{result.quizTitle}</Text>

          <View style={styles.statsRow}>
            {result.playerCount != null && (
              <View style={styles.statItem}>
                <Users size={12} color="rgba(255,255,255,0.6)" />
                <Text style={styles.statText}>{result.playerCount} players</Text>
              </View>
            )}
            {durationMin > 0 && (
              <View style={styles.statItem}>
                <Timer size={12} color="rgba(255,255,255,0.6)" />
                <Text style={styles.statText}>{durationMin} min</Text>
              </View>
            )}
            {result.avgPercentage != null && (
              <Text style={styles.statText}>Avg {result.avgPercentage}%</Text>
            )}
          </View>
        </View>

        {allPlayers.length > 0 ? (
          <View style={styles.leaderboard}>
            <Text style={styles.leaderboardLabel}>Top Finishers</Text>
            {visiblePlayers.map((p, i) => (
              <View key={i} style={[styles.playerRow, i === 0 && styles.playerRowFirst]}>
                {i < 3 ? (
                  <Text style={styles.medal}>{MEDAL[i]}</Text>
                ) : (
                  <Text style={styles.rankNum}>#{p.rank}</Text>
                )}
                <Text
                  style={[styles.playerName, i === 0 ? styles.playerNameFirst : null]}
                  numberOfLines={1}
                >
                  {p.name}
                </Text>
                <View style={styles.playerScores}>
                  <Text style={[styles.playerPct, i === 0 && { color: GOLD }]}>{p.percentage}%</Text>
                  <Text style={styles.playerScore}>
                    {p.score}/{p.total}
                  </Text>
                </View>
              </View>
            ))}

            {hasMore && (
              <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded((v) => !v)}>
                <Text style={styles.expandText}>
                  {expanded ? 'Show less ▲' : `View all ${allPlayers.length} players ▼`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </LinearGradient>
    );
  }

  // Personal result card
  const pct = result.percentage;
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const R = 26;
  const CIRC = 2 * Math.PI * R;

  return (
    <LinearGradient
      colors={['#1e3a5f', '#0f2447']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <View style={styles.personalRow}>
        <View style={styles.ringWrap}>
          <Svg width={64} height={64} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={32} cy={32} r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
            <Circle
              cx={32}
              cy={32}
              r={R}
              fill="none"
              stroke={color}
              strokeWidth={5}
              strokeDasharray={`${CIRC}`}
              strokeDashoffset={CIRC * (1 - pct / 100)}
              strokeLinecap="round"
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={styles.ringPct}>{pct}%</Text>
          </View>
        </View>
        <View style={styles.personalMeta}>
          <Text style={styles.personalLabel}>Quiz Result</Text>
          <Text style={styles.personalTitle} numberOfLines={1}>
            {result.quizTitle}
          </Text>
          <View style={styles.personalStats}>
            <Text style={styles.statText}>
              {result.score}/{result.total} correct
            </Text>
            {result.rank ? <Text style={styles.personalRank}>#{result.rank} rank</Text> : null}
          </View>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  header: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerLabel: { fontFamily: fonts.headingBold, fontSize: 11, color: GOLD, letterSpacing: 1, textTransform: 'uppercase' },
  quizTitle: { fontFamily: fonts.headingBold, fontSize: 15, color: '#fff', lineHeight: 20, marginBottom: 10 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontFamily: fonts.bodyRegular, fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  leaderboard: { paddingHorizontal: 14, paddingBottom: 14 },
  leaderboardLabel: { fontFamily: fonts.headingSemiBold, fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  playerRowFirst: { backgroundColor: 'rgba(255,215,0,0.12)', borderColor: 'rgba(255,215,0,0.25)' },
  medal: { fontSize: 15, minWidth: 24, textAlign: 'center' },
  rankNum: { fontFamily: fonts.headingBold, fontSize: 11, color: 'rgba(255,255,255,0.4)', minWidth: 24, textAlign: 'center' },
  playerName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  playerNameFirst: { fontFamily: fonts.headingBold, color: '#fff' },
  playerScores: { alignItems: 'flex-end' },
  playerPct: { fontFamily: fonts.headingBold, fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  playerScore: { fontFamily: fonts.bodyRegular, fontSize: 10, color: 'rgba(255,255,255,0.35)' },
  expandBtn: { marginTop: 4, paddingVertical: 6, alignItems: 'center' },
  expandText: { fontFamily: fonts.headingSemiBold, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  personalRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 },
  ringWrap: { width: 64, height: 64 },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontFamily: fonts.headingBold, fontSize: 13, color: '#fff' },
  personalMeta: { flex: 1, minWidth: 0 },
  personalLabel: { fontFamily: fonts.headingSemiBold, fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, textTransform: 'uppercase' },
  personalTitle: { fontFamily: fonts.headingBold, fontSize: 14, color: '#fff', lineHeight: 18, marginTop: 2 },
  personalStats: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  personalRank: { fontFamily: fonts.headingBold, fontSize: 11, color: GOLD },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)' },
  progressBar: { height: 3 },
});
