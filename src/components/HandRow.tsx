import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { handValue } from '../blackjack/blackjackEngine';
import type { Card } from '../blackjack/blackjackEngine';
import { casino } from '../theme/casinoTheme';
import { PlayingCard } from './PlayingCard';

interface Props {
  cards: Card[];
  label: string;
  /** Hides every card but the first (used for the dealer's hole card during the player's turn). */
  hideAllButFirst?: boolean;
}

export function HandRow({ cards, label, hideAllButFirst }: Props) {
  const showTotal = !hideAllButFirst && cards.length > 0;
  const { total, soft } = handValue(cards);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {showTotal ? `  ·  ${soft ? 'soft ' : ''}${total}` : ''}
      </Text>
      <View style={styles.row}>
        {cards.map((card, i) => (
          <PlayingCard
            key={`${card.rank}-${card.suit}-${i}`}
            card={card}
            faceDown={hideAllButFirst && i > 0}
            dealDelay={i * 150}
          />
        ))}
        {cards.length === 0 && <PlayingCard faceDown />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
  },
  label: {
    color: casino.gold,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
  },
});
