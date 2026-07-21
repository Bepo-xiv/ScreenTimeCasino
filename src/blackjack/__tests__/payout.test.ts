import { payoutForOutcome, resolveOutcome } from '../blackjackEngine';
import type { Card } from '../blackjackEngine';

const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });
const hand = (cards: Card[]) => ({ cards });

describe('resolveOutcome', () => {
  it('player busts -> lose, regardless of dealer', () => {
    const outcome = resolveOutcome({
      playerHand: hand([c('K'), c('Q'), c('5')]),
      dealerHand: hand([c('10'), c('6')]),
      playerHasNatural: false,
      dealerHasNatural: false,
    });
    expect(outcome).toBe('lose');
  });

  it('both natural blackjack -> push', () => {
    const outcome = resolveOutcome({
      playerHand: hand([c('A'), c('K')]),
      dealerHand: hand([c('A'), c('Q')]),
      playerHasNatural: true,
      dealerHasNatural: true,
    });
    expect(outcome).toBe('push');
  });

  it('player natural only -> blackjack', () => {
    const outcome = resolveOutcome({
      playerHand: hand([c('A'), c('K')]),
      dealerHand: hand([c('10'), c('8')]),
      playerHasNatural: true,
      dealerHasNatural: false,
    });
    expect(outcome).toBe('blackjack');
  });

  it('dealer natural only -> lose', () => {
    const outcome = resolveOutcome({
      playerHand: hand([c('10'), c('9')]),
      dealerHand: hand([c('A'), c('K')]),
      playerHasNatural: false,
      dealerHasNatural: true,
    });
    expect(outcome).toBe('lose');
  });

  it('dealer busts, player does not -> win', () => {
    const outcome = resolveOutcome({
      playerHand: hand([c('10'), c('8')]),
      dealerHand: hand([c('K'), c('Q'), c('5')]),
      playerHasNatural: false,
      dealerHasNatural: false,
    });
    expect(outcome).toBe('win');
  });

  it('higher total wins, lower total loses, equal totals push', () => {
    expect(
      resolveOutcome({
        playerHand: hand([c('10'), c('9')]),
        dealerHand: hand([c('10'), c('7')]),
        playerHasNatural: false,
        dealerHasNatural: false,
      }),
    ).toBe('win');

    expect(
      resolveOutcome({
        playerHand: hand([c('10'), c('7')]),
        dealerHand: hand([c('10'), c('9')]),
        playerHasNatural: false,
        dealerHasNatural: false,
      }),
    ).toBe('lose');

    expect(
      resolveOutcome({
        playerHand: hand([c('10'), c('8')]),
        dealerHand: hand([c('J'), c('8')]),
        playerHasNatural: false,
        dealerHasNatural: false,
      }),
    ).toBe('push');
  });
});

describe('payoutForOutcome', () => {
  it('pays 1:1 net profit on a regular win', () => {
    expect(payoutForOutcome('win', 10)).toBe(10);
  });

  it('pays 3:2 net profit on blackjack', () => {
    expect(payoutForOutcome('blackjack', 10)).toBe(15);
  });

  it('returns 0 delta on push', () => {
    expect(payoutForOutcome('push', 10)).toBe(0);
  });

  it('forfeits the full stake on a loss', () => {
    expect(payoutForOutcome('lose', 10)).toBe(-10);
  });

  it('doubles the effective stake when doubled', () => {
    expect(payoutForOutcome('win', 10, true)).toBe(20);
    expect(payoutForOutcome('lose', 10, true)).toBe(-20);
  });
});
