import { canDouble, canHit, canStand, createInitialGameState, gameReducer } from '../blackjackEngine';
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
    expect(state.playerHand.cards).toEqual([c('10'), c('9')]);
    expect(state.dealerHand.cards).toEqual([c('9'), c('9')]);
    expect(state.shoe).toHaveLength(0);
  });

  it('settles immediately as blackjack when only the player has a natural', () => {
    const shoe = [c('A'), c('9'), c('K'), c('8')];
    const state = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    expect(state.phase).toBe('settled');
    expect(state.outcome).toBe('blackjack');
    expect(state.payoutMinutes).toBe(15);
  });

  it('settles as push when both have a natural', () => {
    const shoe = [c('A'), c('A'), c('K'), c('K')];
    const state = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    expect(state.phase).toBe('settled');
    expect(state.outcome).toBe('push');
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
    expect(hit.outcome).toBe('lose');
    expect(hit.payoutMinutes).toBe(-10);
  });

  it('stays in playerTurn when the extra card does not bust', () => {
    const shoe = [c('4'), c('9'), c('4'), c('9'), c('5')];
    const dealt = gameReducer(stateWithShoe(10, shoe), { type: 'DEAL' });
    const hit = gameReducer(dealt, { type: 'HIT' });
    expect(hit.phase).toBe('playerTurn');
    expect(hit.playerHand.cards).toEqual([c('4'), c('4'), c('5')]);
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
    expect(stood.outcome).toBe('lose');
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
    expect(doubled.doubled).toBe(true);
    expect(doubled.playerHand.cards).toEqual([c('10'), c('5'), c('6')]);
    expect(doubled.dealerHand.cards).toEqual([c('6'), c('5'), c('5'), c('3')]);
    expect(doubled.outcome).toBe('win');
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
    expect(doubled.outcome).toBe('lose');
    expect(doubled.payoutMinutes).toBe(-20);
    expect(doubled.dealerHand.cards).toEqual([c('6'), c('5')]);
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
