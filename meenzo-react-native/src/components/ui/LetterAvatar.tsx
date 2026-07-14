import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colorForInitial } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface Props {
  name: string;
  size?: number;
  uri?: string | null;
}

export default function LetterAvatar({ name, size = 40, uri }: Props) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  const initial = (name?.[0] ?? '?').toUpperCase();
  const bg = colorForInitial(name ?? '');
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={{ color: '#fff', fontFamily: fonts.headingBold, fontSize: size * 0.38 }}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
