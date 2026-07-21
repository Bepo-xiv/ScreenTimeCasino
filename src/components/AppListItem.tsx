import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ManagedApp } from '../storage/configRepo';
import { casino } from '../theme/casinoTheme';
import { AppIcon } from './AppIcon';
import { BudgetBadge } from './BudgetBadge';

interface Props {
  app: ManagedApp;
  remainingMinutes?: number;
  onPress: () => void;
}

export function AppListItem({ app, remainingMinutes, onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.icon}>
        <AppIcon icon={app.icon} label={app.label} size={30} />
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>{app.label}</Text>
        {remainingMinutes !== undefined && <BudgetBadge remainingMinutes={remainingMinutes} />}
      </View>
      <View style={styles.playButton}>
        <Text style={styles.playButtonText}>Jouer</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: casino.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: casino.border,
    padding: 14,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    marginRight: 14,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  label: {
    color: casino.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  playButton: {
    borderWidth: 1.5,
    borderColor: casino.gold,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 10,
  },
  playButtonText: {
    color: casino.gold,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
