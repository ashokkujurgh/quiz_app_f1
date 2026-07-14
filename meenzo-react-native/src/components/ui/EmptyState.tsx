import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import GradientButton from './GradientButton';

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({ icon: Icon, title, subtitle, ctaLabel, onCta }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <Icon size={26} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {ctaLabel ? (
        <GradientButton
          title={ctaLabel}
          onPress={onCta}
          style={styles.cta}
          fontSize={13}
          paddingVertical={10}
          paddingHorizontal={20}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 12,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.softPrimaryBg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 14,
    color: colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 220,
  },
  cta: {
    marginTop: 4,
    paddingHorizontal: 20,
  },
});
