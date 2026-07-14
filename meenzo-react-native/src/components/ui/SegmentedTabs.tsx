import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRAD, GRAD_LOCATIONS, DIAGONAL_START, DIAGONAL_END } from '../../theme/gradients';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface Props {
  items: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

/** Full-width segmented tab bar (friend/profile tabs): #ede9ff track, gradient active pill. */
export default function SegmentedTabs({ items, activeIndex, onChange }: Props) {
  return (
    <View style={styles.track}>
      {items.map((item, i) => {
        const active = i === activeIndex;
        return (
          <TouchableOpacity key={item} activeOpacity={0.8} style={styles.segment} onPress={() => onChange(i)}>
            {active ? (
              <LinearGradient
                colors={GRAD}
                locations={GRAD_LOCATIONS}
                start={DIAGONAL_START}
                end={DIAGONAL_END}
                style={styles.activeSegment}
              >
                <Text style={styles.activeText}>{item}</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.inactiveText}>{item}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activeSegment: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
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
    textAlign: 'center',
    paddingVertical: 8,
  },
});
