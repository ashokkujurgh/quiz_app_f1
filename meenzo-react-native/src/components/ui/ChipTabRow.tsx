import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRAD, GRAD_LOCATIONS, DIAGONAL_START, DIAGONAL_END } from '../../theme/gradients';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface Props {
  items: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

/** Horizontal scrollable filter/category pills — active = gradient fill, inactive = white + border. */
export default function ChipTabRow({ items, activeIndex, onChange }: Props) {
  return (
    <ScrollView horizontal style={styles.outer} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((item, i) => {
        const active = i === activeIndex;
        return (
          <TouchableOpacity key={item} activeOpacity={0.8} onPress={() => onChange(i)}>
            {active ? (
              <LinearGradient
                colors={GRAD}
                locations={GRAD_LOCATIONS}
                start={DIAGONAL_START}
                end={DIAGONAL_END}
                style={styles.pill}
              >
                <Text style={styles.activeText}>{item}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.pill, styles.inactivePill]}>
                <Text style={styles.inactiveText}>{item}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Without this, the horizontal ScrollView can grow along its parent's main (vertical)
  // axis and stretch its row children into tall ovals instead of compact pills.
  outer: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    gap: 8,
    paddingRight: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
  },
  inactivePill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  activeText: {
    color: '#fff',
    fontFamily: fonts.headingSemiBold,
    fontSize: 12,
  },
  inactiveText: {
    color: colors.chipInactiveText,
    fontFamily: fonts.headingSemiBold,
    fontSize: 12,
  },
});
