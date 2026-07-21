import {
  canDouble,
  canHit,
  canSplit,
  canStand,
  createInitialGameState,
  gameReducer,
} from '../blackjackEngine';
import type { Card, GameState } from '../blackjackEngine';

const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });

function stateWithShoe(stake: number, shoe: Card[]): GameState {
  return createInitialGameState(stake, shoe);
}

describe('DEAL', () => {
  it('moves to playerTurn when neither side has a natural', () => {
    const shoe = [c('10'), c('9'), c('9'), c('9')];
    const state = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    expect(state.phase).toBe('playerTurn');
    expect(state.playerHands).toHaveLength(1);
    expect(state.playerHands[0].cards).toEqual([c('10'), c('9')]);
    expect(state.dealerHand.cards).toEqual([c('9'), c('9')]);
    expect(state.shoe).toHaveLength(0);
  });

  it('settles immediately as blackjack when only the player has a natural', () => {
    const shoe = [c('A'), c('9'), c('K'), c('8')];
    const state = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    expect(state.phase).toBe('settled');
    expect(state.playerHands[0].outcome).toBe('blackjack');
    expect(state.payoutMinutes).toBe(15);
  });

  it('settles as push when both have a natural', () => {
    const shoe = [c('A'), c('A'), c('K'), c('K')];
    const state = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    expect(state.phase).toBe('settled');
    expect(state.playerHands[0].outcome).toBe('push');
    expect(state.payoutMinutes).toBe(0);
  });

  it('is a no-op outside the betting phase', () => {
    const shoe = [c('10'), c('9'), c('9'), c('9')];
    const dealt = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    const dealtAgain = gameReducer(dealt, { type: 'DEAL' });
    expect(dealtAgain).toBe(dealt);
  });
});

describe('HIT', () => {
  it('settles as lose when the extra card busts the player', () => {
    const shoe = [c('10'), c('9'), c('9'), c('9'), c('K')];
    const dealt = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    const hit = gameReducer(dealt, { type: 'HIT' });
    expect(hit.phase).toBe('settled');
    expect(hit.playerHands[0].outcome).toBe('lose');
    expect(hit.payoutMinutes).toBe(-10);
  });

  it('stays in playerTurn when the extra card does not bust', () => {
    const shoe = [c('4'), c('9'), c('4'), c('9'), c('5')];
    const dealt = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    const hit = gameReducer(dealt, { type: 'HIT' });
    expect(hit.phase).toBe('playerTurn');
    expect(hit.playerHands[0].cards).toEqual([c('4'), c('4'), c('5')]);
  });
});

describe('STAND', () => {
  it('draws the dealer up to 17+ and resolves the outcome', () => {
    const shoe = [c('10'), c('6'), c('8'), c('5'), c('K')];
    const dealt = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    expect(dealt.phase).toBe('playerTurn');
    const stood = gameReducer(dealt, { type: 'STAND' });
    expect(stood.phase).toBe('settled');
    expect(stood.dealerHand.cards).toEqual([c('6'), c('5'), c('K')]);
    expect(stood.playerHands[0].outcome).toBe('lose');
    expect(stood.payoutMinutes).toBe(-10);
  });
});

describe('DOUBLE', () => {
  it('doubles the stake, draws exactly one card, then plays out the dealer', () => {
    const shoe = [c('10'), c('6'), c('5'), c('5'), c('6'), c('5'), c('3')];
    const dealt = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    expect(canDouble(dealt)).toBe(true);

    const doubled = gameReducer(dealt, { type: 'DOUBLE' });
    expect(doubled.phase).toBe('settled');
    expect(doubled.playerHands[0].doubled).toBe(true);
    expect(doubled.playerHands[0].cards).toEqual([c('10'), c('5'), c('6')]);
    expect(doubled.dealerHand.cards).toEqual([c('6'), c('5'), c('5'), c('3')]);
    expect(doubled.playerHands[0].outcome).toBe('win');
    expect(doubled.payoutMinutes).toBe(20);
  });

  it('is not allowed after the first player action', () => {
    const shoe = [c('4'), c('9'), c('4'), c('9'), c('2'), c('2')];
    const dealt = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    const hit = gameReducer(dealt, { type: 'HIT' });
    expect(canDouble(hit)).toBe(false);
    expect(gameReducer(hit, { type: 'DOUBLE' })).toBe(hit);
  });

  it('settles as lose without playing the dealer when doubling busts', () => {
    const shoe = [c('10'), c('6'), c('5'), c('5'), c('K')];
    const dealt = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    const doubled = gameReducer(dealt, { type: 'DOUBLE' });
    expect(doubled.phase).toBe('settled');
    expect(doubled.playerHands[0].outcome).toBe('lose');
    expect(doubled.payoutMinutes).toBe(-20);
    expect(doubled.dealerHand.cards).toEqual([c('6'), c('5')]);
  });
});

describe('SPLIT', () => {
  it('is only allowed with exactly 2 cards of the same rank, and only once', () => {
    const shoe = [c('9'), c('6'), c('8'), c('4')]; // 9/8 don't match
    const dealt = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    expect(canSplit(dealt)).toBe(false);
    expect(gameReducer(dealt, { type: 'SPLIT' })).toBe(dealt);
  });

  it('deals each hand independently and sums their payouts', () => {
    // DEAL: player 9,9 ; dealer 6,4. SPLIT draws K for hand 0 (9+K=19).
    // Standing on hand 0 deals hand 1 its second card (2 -> 9+2=11), standing on hand 1
    // then plays the dealer out (6+4=10, draws 8 -> 18) and resolves both hands.
    const shoe = [c('9'), c('6'), c('9'), c('4'), c('K'), c('2'), c('8')];
    const dealt = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    expect(canSplit(dealt)).toBe(true);

    const split = gameReducer(dealt, { type: 'SPLIT' });
    expect(split.phase).toBe('playerTurn');
    expect(split.activeHandIndex).toBe(0);
    expect(split.playerHands).toHaveLength(2);
    expect(split.playerHands[0].cards).toEqual([c('9'), c('K')]);
    expect(split.playerHands[1].cards).toEqual([c('9')]);
    expect(canSplit(split)).toBe(false); // no re-splitting

    const standHand0 = gameReducer(split, { type: 'STAND' });
    expect(standHand0.phase).toBe('playerTurn');
    expect(standHand0.activeHandIndex).toBe(1);
    expect(standHand0.playerHands[1].cards).toEqual([c('9'), c('2')]);

    const standHand1 = gameReducer(standHand0, { type: 'STAND' });
    expect(standHand1.phase).toBe('settled');
    expect(standHand1.dealerHand.cards).toEqual([c('6'), c('4'), c('8')]);
    expect(standHand1.playerHands[0].outcome).toBe('win'); // 19 vs 18
    expect(standHand1.playerHands[0].payoutMinutes).toBe(10);
    expect(standHand1.playerHands[1].outcome).toBe('lose'); // 11 vs 18
    expect(standHand1.playerHands[1].payoutMinutes).toBe(-10);
    expect(standHand1.payoutMinutes).toBe(0);
  });

  it('allows doubling a hand after splitting (DAS)', () => {
    const shoe = [c('9'), c('6'), c('9'), c('4'), c('K')];
    const dealt = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    const split = gameReducer(dealt, { type: 'SPLIT' });
    expect(canDouble(split)).toBe(true);
  });

  it('splitting a pair of Aces deals exactly one extra card per hand and never pays as a natural', () => {
    // DEAL: player A,A ; dealer 7,6. SPLIT draws K for hand 0 (A+K=21) and immediately
    // finishes it (split aces get one card only); hand 1 then also gets one card (9 -> A+9=20)
    // and is finished the same way, so the whole round resolves in a single SPLIT dispatch.
    const shoe = [c('A'), c('7'), c('A'), c('6'), c('K'), c('9'), c('4')];
    const dealt = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    expect(dealt.phase).toBe('playerTurn'); // A+A = 12, not a natural
    expect(canSplit(dealt)).toBe(true);

    const split = gameReducer(dealt, { type: 'SPLIT' });
    expect(split.phase).toBe('settled');
    expect(split.dealerHand.cards).toEqual([c('7'), c('6'), c('4')]);

    expect(split.playerHands[0].cards).toEqual([c('A'), c('K')]);
    expect(split.playerHands[0].outcome).toBe('win');
    // 21 via a split ace is NOT a natural blackjack: paid 1:1, not 3:2.
    expect(split.playerHands[0].payoutMinutes).toBe(10);

    expect(split.playerHands[1].cards).toEqual([c('A'), c('9')]);
    expect(split.playerHands[1].outcome).toBe('win');
    expect(split.playerHands[1].payoutMinutes).toBe(10);

    expect(split.payoutMinutes).toBe(20);
  });
});

describe('selectors', () => {
  it('canHit/canStand are true only during playerTurn', () => {
    const shoe = [c('10'), c('9'), c('9'), c('9')];
    const betting = stateWithShoe(10, shoe);
    expect(canHit(betting)).toBe(false);
    expect(canStand(betting)).toBe(false);

    const dealt = gameReducer(betting, { type: 'DEAL' });
    expect(canHit(dealt)).toBe(true);
    expect(canStand(dealt)).toBe(true);
  });
});
