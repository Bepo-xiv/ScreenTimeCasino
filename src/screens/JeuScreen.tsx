import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BudgetBadge } from '../components/BudgetBadge';
import { HandRow } from '../components/HandRow';
import {
  canDouble,
  canHit,
  canStand,
  createInitialGameState,
  createShoe,
  gameReducer,
} from '../blackjack/blackjackEngine';
import type { GameState, Outcome } from '../blackjack/blackjackEngine';
import type { RootStackParamList } from '../navigation/types';
import { applyHandResult, getAvailableMinutes } from '../blackjack/screenTimeTracker';
import { casino } from '../theme/casinoTheme';
import { getManagedApp, type ManagedApp } from '../storage/configRepo';
import { appendHandRecord } from '../storage/historyRepo';

type Props = NativeStackScreenProps<RootStackParamList, 'Jeu'>;

const STAKE_STEP = 5;
const MIN_STAKE = 5;

const OUTCOME_LABEL: Record<Outcome, string> = {
  win: 'VOUS GAGNEZ',
  blackjack: 'BLACKJACK !',
  lose: 'VOUS PERDEZ',
  push: 'ÉGALITÉ',
};

const OUTCOME_COLOR: Record<Outcome, string> = {
  win: casino.win,
  blackjack: casino.gold,
  lose: casino.lose,
  push: casino.push,
};

export function JeuScreen({ route, navigation }: Props) {
  const { packageName } = route.params;
  const [app, setApp] = useState<ManagedApp | undefined>();
  const [remaining, setRemaining] = useState<number>(0);
  const [stake, setStake] = useState(MIN_STAKE);
  const [game, setGame] = useState<GameState | null>(null);
  const [lastPayout, setLastPayout] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const managedApp = getManagedApp(packageName);
    setApp(managedApp);
    setRemaining(await getAvailableMinutes(packageName));
  }, [packageName]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: app?.label ?? 'Blackjack' });
  }, [navigation, app]);

  async function settle(next: GameState) {
    const { payoutMinutes, remainingMinutes } = await applyHandResult(
      packageName,
      next.outcome!,
      next.stakeMinutes,
      next.doubled,
    );
    appendHandRecord({
      packageName,
      stakeMinutes: next.stakeMinutes,
      doubled: next.doubled,
      outcome: next.outcome!,
      payoutMinutes,
      resultingRemaining: remainingMinutes,
    });
    setLastPayout(payoutMinutes);
    setRemaining(remainingMinutes);
  }

  function handleDeal() {
    const dealt = gameReducer(createInitialGameState(stake, createShoe(1)), { type: 'DEAL' });
    setGame(dealt);
    setLastPayout(null);
    if (dealt.phase === 'settled') settle(dealt);
  }

  function act(action: 'HIT' | 'STAND' | 'DOUBLE') {
    if (!game) return;
    const next = gameReducer(game, { type: action });
    setGame(next);
    if (next.phase === 'settled') settle(next);
  }

  function handlePlayAgain() {
    setGame(null);
  }

  const maxStake = Math.max(remaining, 30);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appLabel}>
          {app?.icon} {app?.label}
        </Text>
        <BudgetBadge remainingMinutes={remaining} />
      </View>

      {game ? (
        <>
          <HandRow cards={game.dealerHand.cards} label="Croupier" hideAllButFirst={game.phase === 'playerTurn'} />
          <HandRow cards={game.playerHand.cards} label="Vous" />

          {game.phase === 'settled' && (
            <View style={styles.outcomeBox}>
              <Text style={[styles.outcomeText, { color: OUTCOME_COLOR[game.outcome!] }]}>
                {OUTCOME_LABEL[game.outcome!]}
              </Text>
              <Text style={styles.payoutText}>
                {lastPayout !== null && lastPayout >= 0 ? '+' : ''}
                {lastPayout ?? 0} min
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            {game.phase === 'playerTurn' && (
              <>
                <ActionButton label="Tirer" onPress={() => act('HIT')} disabled={!canHit(game)} />
                <ActionButton label="Rester" onPress={() => act('STAND')} disabled={!canStand(game)} />
                <ActionButton label="Doubler" onPress={() => act('DOUBLE')} disabled={!canDouble(game)} />
              </>
            )}
            {game.phase === 'settled' && <ActionButton label="Rejouer" onPress={handlePlayAgain} primary />}
          </View>
        </>
      ) : (
        <View style={styles.bettingBox}>
          <Text style={styles.stakeLabel}>Votre mise</Text>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepperButton}
              onPress={() => setStake(s => Math.max(MIN_STAKE, s - STAKE_STEP))}>
              <Text style={styles.stepperGlyph}>−</Text>
            </Pressable>
            <Text style={styles.stakeValue}>{stake} min</Text>
            <Pressable
              style={styles.stepperButton}
              onPress={() => setStake(s => Math.min(maxStake, s + STAKE_STEP))}>
              <Text style={styles.stepperGlyph}>+</Text>
            </Pressable>
          </View>
          <ActionButton label="Distribuer" onPress={handleDeal} primary />
        </View>
      )}
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  primary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      style={[styles.actionButton, primary && styles.actionButtonPrimary, disabled && styles.actionButtonDisabled]}
      onPress={onPress}
      disabled={disabled}>
      <Text style={[styles.actionButtonText, primary && styles.actionButtonTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: casino.tableFelt,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  appLabel: {
    color: casino.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  bettingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stakeLabel: {
    color: casino.gold,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  stepperButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: casino.tableFeltDark,
    borderWidth: 1,
    borderColor: casino.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperGlyph: {
    color: casino.gold,
    fontSize: 22,
    fontWeight: '700',
  },
  stakeValue: {
    color: casino.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    marginHorizontal: 22,
    minWidth: 90,
    textAlign: 'center',
  },
  outcomeBox: {
    alignItems: 'center',
    marginVertical: 12,
  },
  outcomeText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
  },
  payoutText: {
    color: casino.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 'auto',
    marginBottom: 24,
  },
  actionButton: {
    borderWidth: 1.5,
    borderColor: casino.gold,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  actionButtonPrimary: {
    backgroundColor: casino.gold,
  },
  actionButtonDisabled: {
    opacity: 0.35,
  },
  actionButtonText: {
    color: casino.gold,
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtonTextPrimary: {
    color: casino.tableFeltDark,
  },
});
