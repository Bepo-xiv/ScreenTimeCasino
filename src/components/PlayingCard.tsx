import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import type { Card, Suit } from '../blackjack/blackjackEngine';
import { casino } from '../theme/casinoTheme';

const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

interface Props {
  card?: Card;
  faceDown?: boolean;
  /** Délai (ms) avant l'animation d'entrée, pour simuler une distribution carte par carte. */
  dealDelay?: number;
}

export function PlayingCard({ card, faceDown, dealDelay = 0 }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      delay: dealDelay,
      useNativeDriver: true,
    }).start();
    // Une nouvelle instance de carte (clé différente dans HandRow) rejoue toujours cette
    // animation au montage ; pas besoin de la redéclencher sur d'autres changements.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = {
    opacity: progress,
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
    ],
  };

  if (faceDown || !card) {
    return (
      <Animated.View style={[styles.card, styles.faceDown, animatedStyle]}>
        <Text style={styles.faceDownGlyph}>♠</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Text style={styles.rank}>{card.rank}</Text>
      <Text style={styles.suit}>{SUIT_SYMBOL[card.suit]}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 56,
    height: 78,
    borderRadius: 8,
    backgroundColor: casino.cardFace,
    borderWidth: 1,
    borderColor: casino.cardFaceDark,
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
    backgroundColor: casino.cardBack,
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
    color: casino.cardInk,
  },
  suit: {
    fontSize: 18,
    color: casino.cardInk,
  },
});
