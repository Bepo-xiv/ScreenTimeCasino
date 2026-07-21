import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Card, Suit } from '../blackjack/blackjackEngine';
import { casino } from '../theme/casinoTheme';

const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const RED_SUITS: Suit[] = ['hearts', 'diamonds'];

interface Props {
  card?: Card;
  faceDown?: boolean;
}

export function PlayingCard({ card, faceDown }: Props) {
  if (faceDown || !card) {
    return (
      <View style={[styles.card, styles.faceDown]}>
        <Text style={styles.faceDownGlyph}>♠</Text>
      </View>
    );
  }

  const isRed = RED_SUITS.includes(card.suit);
  return (
    <View style={styles.card}>
      <Text style={[styles.rank, isRed ? styles.red : styles.light]}>{card.rank}</Text>
      <Text style={[styles.suit, isRed ? styles.red : styles.light]}>{SUIT_SYMBOL[card.suit]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 56,
    height: 78,
    borderRadius: 8,
    backgroundColor: casino.cardFace,
    borderWidth: 1,
    borderColor: casino.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  faceDown: {
    backgroundColor: casino.tableFeltDark,
    borderWidth: 2,
    borderColor: casino.gold,
  },
  faceDownGlyph: {
    fontSize: 26,
    color: casino.gold,
  },
  rank: {
    fontSize: 20,
    fontWeight: '700',
  },
  suit: {
    fontSize: 18,
  },
  red: {
    color: casino.cardRed,
  },
  light: {
    color: casino.cardLight,
  },
});
