import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { BudgetBadge } from '../components/BudgetBadge';
import { ChipSelector } from '../components/ChipSelector';
import { HandRow } from '../components/HandRow';
import {
  canDouble,
  canHit,
  canSplit,
  canStand,
  createInitialGameState,
  createShoe,
  gameReducer,
} from '../blackjack/blackjackEngine';
import type { GameState, Outcome } from '../blackjack/blackjackEngine';
import type { RootStackParamList } from '../navigation/types';
import { applyHandResult, getStakingStatus, MIN_STAKE, type StakingStatus } from '../blackjack/screenTimeTracker';
import { casino, silverTextStyle } from '../theme/casinoTheme';
import { getManagedApp, type ManagedApp } from '../storage/configRepo';
import { appendHandRecord } from '../storage/historyRepo';

type Props = NativeStackScreenProps<RootStackParamList, 'Jeu'>;

const CHIP_DENOMINATIONS = [1, 5, 10, 30];
/** Sabot à 4 jeux de 52 cartes (208 cartes), pour limiter le risque d'épuiser le sabot avec des re-splits. */
const DECK_COUNT = 4;

const OUTCOME_LABEL: Record<Outcome, string> = {
  win: 'GAGNÉ',
  blackjack: 'BLACKJACK !',
  lose: 'PERDU',
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
  const [status, setStatus] = useState<StakingStatus | null>(null);
  const [stake, setStake] = useState(MIN_STAKE);
  const [game, setGame] = useState<GameState | null>(null);
  // Reflète `stake` de façon synchrone (contrairement au state React, mis à jour immédiatement,
  // sans attendre un nouveau rendu) : permet de refuser un ajout de jeton qui dépasserait la
  // mise max même si plusieurs taps arrivent avant que l'écran n'ait eu le temps de se redessiner.
  const stakeRef = useRef(stake);

  function setStakeValue(next: number) {
    stakeRef.current = next;
    setStake(next);
  }

  const refresh = useCallback(async () => {
    setApp(getManagedApp(packageName));
    setStatus(await getStakingStatus(packageName));
  }, [packageName]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Garde la mise dans les bornes autorisées : forcée à la mise de secours si on est
  // dans ce cas, sinon ramenée à la mise max si le solde a baissé sous la mise choisie.
  useEffect(() => {
    if (!status) return;
    if (status.usingGrace) {
      setStakeValue(status.maxStake);
    } else {
      setStakeValue(Math.min(stakeRef.current, Math.max(status.maxStake, MIN_STAKE)));
    }
  }, [status]);

  /** Ajoute un jeton à la mise, en refusant tout ajout qui la ferait dépasser la mise max. */
  function handleAddChip(value: number) {
    if (!status) return;
    const next = stakeRef.current + value;
    if (next > status.maxStake) return;
    setStakeValue(next);
  }

  useLayoutEffect(() => {
    navigation.setOptions({ title: app?.label ?? 'Blackjack' });
  }, [navigation, app]);

  // Applique le résultat de chaque main (une seule, ou deux après un split) au solde, dans
  // l'ordre, puis journalise chacune séparément dans l'historique.
  async function settle(next: GameState) {
    for (const hand of next.playerHands) {
      await applyHandResult(packageName, hand.outcome!, next.stakeMinutes, hand.doubled);
    }
    const nextStatus = await getStakingStatus(packageName);
    for (const hand of next.playerHands) {
      appendHandRecord({
        packageName,
        stakeMinutes: next.stakeMinutes,
        doubled: hand.doubled,
        outcome: hand.outcome!,
        payoutMinutes: hand.payoutMinutes!,
        resultingRemaining: nextStatus.remainingMinutes,
      });
    }
    setStatus(nextStatus);
  }

  function handleDeal() {
    const dealt = gameReducer(createInitialGameState(stake, createShoe(DECK_COUNT)), { type: 'DEAL' });
    setGame(dealt);
    if (dealt.phase === 'settled') settle(dealt);
  }

  function act(action: 'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT') {
    if (!game) return;
    const next = gameReducer(game, { type: action });
    setGame(next);
    if (next.phase === 'settled') settle(next);
  }

  function handlePlayAgain() {
    setGame(null);
  }

  if (!status) return null;

  const split = game && game.playerHands.length > 1;
  const splitAffordable = game ? game.stakeMinutes * 2 <= status.maxStake : false;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.appLabelRow}>
          {app && <AppIcon icon={app.icon} label={app.label} size={22} />}
          <Text style={styles.appLabel}>{app?.label}</Text>
        </View>
        <BudgetBadge remainingMinutes={status.remainingMinutes} />
      </View>

      {game ? (
        <>
          <HandRow cards={game.dealerHand.cards} label="Croupier" hideAllButFirst={game.phase === 'playerTurn'} />

          <View style={styles.playerHands}>
            {game.playerHands.map((hand, i) => (
              <View
                key={i}
                style={[
                  styles.playerHandColumn,
                  split && game.phase === 'playerTurn' && i === game.activeHandIndex && styles.activeHandColumn,
                ]}>
                <HandRow cards={hand.cards} label={split ? `Main ${i + 1}` : 'Vous'} />
                {game.phase === 'settled' && hand.outcome && (
                  <View style={styles.outcomeBox}>
                    <Text style={[styles.outcomeText, { color: OUTCOME_COLOR[hand.outcome] }]}>
                      {OUTCOME_LABEL[hand.outcome]}
                    </Text>
                    <Text style={styles.payoutText}>
                      {hand.payoutMinutes! >= 0 ? '+' : ''}
                      {hand.payoutMinutes} min
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            {game.phase === 'playerTurn' && (
              <>
                <ActionButton label="Tirer" onPress={() => act('HIT')} disabled={!canHit(game)} />
                <ActionButton label="Rester" onPress={() => act('STAND')} disabled={!canStand(game)} />
                <ActionButton
                  label="Doubler"
                  onPress={() => act('DOUBLE')}
                  disabled={!canDouble(game) || status.usingGrace}
                />
                {canSplit(game) && (
                  <ActionButton
                    label="Split"
                    onPress={() => act('SPLIT')}
                    disabled={status.usingGrace || !splitAffordable}
                  />
                )}
              </>
            )}
            {game.phase === 'settled' && <ActionButton label="Rejouer" onPress={handlePlayAgain} primary />}
          </View>
        </>
      ) : status.locked ? (
        <View style={styles.lockedBox}>
          <Text style={styles.lockedTitle}>Verrouillé pour aujourd'hui</Text>
          <Text style={styles.lockedBody}>
            Plus aucune mise possible sur {app?.label ?? 'cette app'} — reviens demain.
          </Text>
        </View>
      ) : (
        <View style={styles.bettingBox}>
          <Text style={styles.stakeLabel}>{status.usingGrace ? 'Mise de secours' : 'Votre mise'}</Text>
          <View style={styles.stakeRow}>
            <Text style={styles.stakeValue}>{stake} min</Text>
            {!status.usingGrace && stake > MIN_STAKE && (
              <Pressable onPress={() => setStakeValue(MIN_STAKE)} hitSlop={10}>
                <Text style={styles.clearLink}>Effacer</Text>
              </Pressable>
            )}
          </View>

          {status.usingGrace ? (
            <Text style={styles.graceHint}>Dernière chance : {status.maxStake} min, tout ou rien.</Text>
          ) : (
            <ChipSelector
              denominations={CHIP_DENOMINATIONS}
              currentStake={stake}
              maxStake={status.maxStake}
              onAdd={handleAddChip}
            />
          )}

          <ActionButton label="Distribuer" onPress={handleDeal} primary style={styles.dealButton} />
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
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      style={[styles.actionButton, primary && styles.actionButtonPrimary, disabled && styles.actionButtonDisabled, style]}
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
  appLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appLabel: {
    ...silverTextStyle,
    fontSize: 18,
    fontWeight: '700',
  },
  bettingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lockedTitle: {
    color: casino.lose,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  lockedBody: {
    ...silverTextStyle,
    fontSize: 15,
    textAlign: 'center',
  },
  stakeLabel: {
    color: casino.gold,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  stakeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 14,
    marginBottom: 20,
  },
  stakeValue: {
    ...silverTextStyle,
    fontSize: 30,
    fontWeight: '800',
    minWidth: 100,
    textAlign: 'center',
  },
  clearLink: {
    color: casino.goldMuted,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  graceHint: {
    ...silverTextStyle,
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  playerHands: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  playerHandColumn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 18,
  },
  activeHandColumn: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: casino.gold,
    borderRadius: 18,
  },
  outcomeBox: {
    alignItems: 'center',
    marginTop: -4,
    marginBottom: 8,
  },
  outcomeText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  payoutText: {
    ...silverTextStyle,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 'auto',
    marginBottom: 24,
  },
  dealButton: {
    marginTop: 28,
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
