import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { Outcome } from '../blackjack/blackjackEngine';
import { AppIcon } from '../components/AppIcon';
import { casino, silverTextStyle } from '../theme/casinoTheme';
import { getManagedApp } from '../storage/configRepo';
import { getHistory, type HandRecord } from '../storage/historyRepo';

const OUTCOME_LABEL: Record<Outcome, string> = {
  win: 'Gagné',
  blackjack: 'Blackjack',
  lose: 'Perdu',
  push: 'Égalité',
};

const OUTCOME_COLOR: Record<Outcome, string> = {
  win: casino.win,
  blackjack: casino.gold,
  lose: casino.lose,
  push: casino.textSecondary,
};

/** Vrai si un timestamp tombe le jour calendaire actuel (heure locale). */
function isToday(timestamp: number): boolean {
  const then = new Date(timestamp);
  const now = new Date();
  return (
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate()
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function HistoriqueScreen() {
  const [hands, setHands] = useState<HandRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      setHands(getHistory().filter(record => isToday(record.timestamp)));
    }, []),
  );

  const totalPayout = hands.reduce((sum, hand) => sum + hand.payoutMinutes, 0);

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Parties jouées aujourd’hui</Text>
        <Text style={styles.summaryValue}>{hands.length}</Text>
        <Text style={[styles.summaryDelta, { color: totalPayout >= 0 ? casino.win : casino.lose }]}>
          {totalPayout >= 0 ? '+' : ''}
          {totalPayout} min au total
        </Text>
      </View>

      <FlatList
        data={hands}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucune partie jouée aujourd’hui.</Text>}
        renderItem={({ item }) => {
          const app = getManagedApp(item.packageName);
          return (
            <View style={styles.row}>
              <View style={styles.icon}>
                <AppIcon icon={app?.icon} label={app?.label ?? item.packageName} size={26} />
              </View>
              <View style={styles.info}>
                <Text style={styles.label}>{app?.label ?? item.packageName}</Text>
                <Text style={styles.meta}>
                  {formatTime(item.timestamp)} · mise {item.stakeMinutes} min
                  {item.doubled ? ' (doublée)' : ''}
                </Text>
              </View>
              <View style={styles.resultColumn}>
                <Text style={[styles.outcome, { color: OUTCOME_COLOR[item.outcome] }]}>
                  {OUTCOME_LABEL[item.outcome]}
                </Text>
                <Text style={[styles.payout, { color: item.payoutMinutes >= 0 ? casino.win : casino.lose }]}>
                  {item.payoutMinutes >= 0 ? '+' : ''}
                  {item.payoutMinutes} min
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: casino.background,
  },
  summary: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: casino.surface,
    borderWidth: 1,
    borderColor: casino.border,
  },
  summaryLabel: {
    color: casino.textSecondary,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryValue: {
    ...silverTextStyle,
    fontSize: 32,
    fontWeight: '900',
  },
  summaryDelta: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  emptyText: {
    ...silverTextStyle,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: casino.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: casino.border,
    padding: 14,
    marginBottom: 10,
  },
  icon: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  label: {
    color: casino.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    color: casino.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  resultColumn: {
    alignItems: 'flex-end',
  },
  outcome: {
    fontSize: 13,
    fontWeight: '800',
  },
  payout: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
});
