import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Trophy } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { QuizzesStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import { GRAD, GRAD_LOCATIONS, DIAGONAL_START, DIAGONAL_END } from '../../theme/gradients';
import GradientText from '../../components/ui/GradientText';
import GradientButton from '../../components/ui/GradientButton';

type Props = NativeStackScreenProps<QuizzesStackParamList, 'PracticeQuiz'>;

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PracticeQuizScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { quizTitle, questions } = route.params;
  const shuffled = useMemo(() => shuffle(questions), [questions]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  const question = shuffled[index];

  const onSelect = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === question.correctOption) setCorrectCount((c) => c + 1);
  };

  const onNext = () => {
    if (index + 1 >= shuffled.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  };

  if (done) {
    const percentage = Math.round((correctCount / shuffled.length) * 100);
    return (
      <View style={[styles.flex, styles.center, { paddingTop: insets.top }]}>
        <Trophy size={32} color={colors.primary} />
        <GradientText style={styles.percentage}>{percentage}%</GradientText>
        <Text style={styles.scoreLine}>
          {correctCount} / {shuffled.length} correct — practice only, not saved to your record
        </Text>
        <GradientButton title="Done" onPress={() => navigation.goBack()} style={styles.doneBtn} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.practiceLabel}>Practice</Text>
          <Text style={styles.title} numberOfLines={1}>
            {quizTitle}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <X size={16} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <Text style={styles.progress}>
        Question {index + 1} / {shuffled.length}
      </Text>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{question.text}</Text>
        </View>

        <View style={styles.options}>
          {question.options.map((opt, i) => {
            const isCorrect = selected !== null && question.correctOption === i;
            const isWrongSelected = selected === i && question.correctOption !== i;

            if (isCorrect) {
              return (
                <LinearGradient key={i} colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.option}>
                  <View style={styles.optionInner}>
                    <View style={[styles.optionLetter, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                      <Text style={[styles.optionLetterText, { color: '#fff' }]}>{OPTION_LETTERS[i]}</Text>
                    </View>
                    <Text style={[styles.optionText, { color: '#fff' }]}>{opt.text}</Text>
                  </View>
                </LinearGradient>
              );
            }

            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.85}
                style={[styles.option, styles.optionCard, isWrongSelected && styles.optionWrong]}
                onPress={() => onSelect(i)}
                disabled={selected !== null}
              >
                <View style={styles.optionInner}>
                  <View style={styles.optionLetter}>
                    <Text style={styles.optionLetterText}>{OPTION_LETTERS[i]}</Text>
                  </View>
                  <Text style={styles.optionText}>{opt.text}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {selected !== null ? (
        <View style={styles.footer}>
          <GradientButton title={index + 1 >= shuffled.length ? 'See Results' : 'Next Question'} onPress={onNext} style={{ width: '100%' }} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  practiceLabel: { fontFamily: fonts.headingSemiBold, fontSize: 10, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontFamily: fonts.headingBold, fontSize: 15, color: colors.foreground, marginTop: 2, maxWidth: 240 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.softPrimaryBg, alignItems: 'center', justifyContent: 'center' },
  progress: { fontFamily: fonts.headingSemiBold, fontSize: 12, color: colors.mutedForeground, paddingHorizontal: 20, paddingTop: 12 },
  body: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, gap: 20 },
  questionCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 20 },
  questionText: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.foreground, lineHeight: 23 },
  options: { gap: 12 },
  option: { borderRadius: radius.md, padding: 16 },
  optionCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  optionWrong: { borderColor: colors.destructive, backgroundColor: 'rgba(212,24,61,0.08)' },
  optionInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionLetter: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  optionLetterText: { fontFamily: fonts.headingBold, fontSize: 12, color: colors.foreground },
  optionText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.foreground },
  footer: { padding: 20 },
  percentage: { fontFamily: fonts.headingBlack, fontSize: 44, marginTop: 12 },
  scoreLine: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.mutedForeground, textAlign: 'center' },
  doneBtn: { width: '100%', marginTop: 20 },
});
