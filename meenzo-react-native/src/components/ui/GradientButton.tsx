import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRAD, GRAD_LOCATIONS, DIAGONAL_START, DIAGONAL_END } from '../../theme/gradients';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';

interface Props {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  fontSize?: number;
  borderRadius?: number;
  paddingVertical?: number;
  paddingHorizontal?: number;
}

export default function GradientButton({
  title,
  onPress,
  disabled,
  loading,
  style,
  fontSize = 15,
  borderRadius = radius.md,
  paddingVertical = 14,
  paddingHorizontal,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[style, disabled ? styles.disabled : null]}
    >
      <LinearGradient
        colors={GRAD}
        locations={GRAD_LOCATIONS}
        start={DIAGONAL_START}
        end={DIAGONAL_END}
        style={[styles.gradient, { borderRadius, paddingVertical, paddingHorizontal }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.text, { fontSize }]}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontFamily: fonts.headingBold,
  },
  disabled: {
    opacity: 0.5,
  },
});
