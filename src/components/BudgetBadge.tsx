import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { casino } from '../theme/casinoTheme';

interface Props {
  remainingMinutes: number;
}

function colorFor(remaining: number): string {
  if (remaining <= 0) return casino.lose;
  if (remaining <= 10) return casino.warning;
  return casino.win;
}

export function BudgetBadge({ remainingMinutes }: Props) {
  const clamped = Math.max(0, remainingMinutes);
  const color = colorFor(remainingMinutes);
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>
        {remainingMinutes <= 0 ? 'TEMPS ÉPUISÉ' : `${clamped} min disponibles`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
});
