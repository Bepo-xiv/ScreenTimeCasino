import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { casino, chipColor } from '../theme/casinoTheme';

interface Props {
  denominations: number[];
  currentStake: number;
  maxStake: number;
  disabled?: boolean;
  onAdd: (value: number) => void;
}

/** Rangée de jetons de casino, tapotés pour composer la mise (remplace un curseur +/-). */
export function ChipSelector({ denominations, currentStake, maxStake, disabled, onAdd }: Props) {
  return (
    <View style={styles.row}>
      {denominations.map(value => {
        const wouldExceed = currentStake + value > maxStake;
        const chipDisabled = disabled || wouldExceed;
        return (
          <Pressable
            key={value}
            disabled={chipDisabled}
            onPress={() => onAdd(value)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: chipColor(value) },
              chipDisabled && styles.chipDisabled,
              pressed && !chipDisabled && styles.chipPressed,
            ]}>
            <Text style={styles.chipValue}>{value}</Text>
            <Text style={styles.chipUnit}>min</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  chip: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  chipPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  chipDisabled: {
    opacity: 0.3,
  },
  chipValue: {
    color: casino.silverBright,
    fontSize: 15,
    fontWeight: '800',
  },
  chipUnit: {
    color: casino.silverBright,
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.8,
  },
});
