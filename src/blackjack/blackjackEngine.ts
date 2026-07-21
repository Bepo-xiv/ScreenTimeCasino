// ============================================================================
// Types
// ============================================================================

/** Les 4 familles d'un jeu de 52 cartes. */
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

/** Les 13 valeurs possibles d'une carte, de l'As (A) au Roi (K). */
export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

/** Une carte à jouer : une valeur (rank) associée à une famille (suit). */
export interface Card {
  rank: Rank;
  suit: Suit;
}

/** Une main : simplement la liste des cartes actuellement possédées (joueur ou croupier). */
export interface Hand {
  cards: Card[];
}

/** Résultat possible d'une main une fois terminée. */
export type Outcome = 'win' | 'blackjack' | 'lose' | 'push';

/** Étape actuelle de la partie : mise, tour du joueur, tour du croupier, ou main terminée. */
export type GamePhase = 'betting' | 'playerTurn' | 'dealerTurn' | 'settled';

/** État complet d'une partie de blackjack à un instant donné. */
export interface GameState {
  shoe: Card[];
  playerHand: Hand;
  dealerHand: Hand;
  stakeMinutes: number;
  phase: GamePhase;
  doubled: boolean;
  outcome?: Outcome;
  /** Delta net de minutes à appliquer au budget de l'app une fois la main réglée. */
  payoutMinutes?: number;
}

/** Actions que le joueur peut déclencher pendant une partie. */
export type GameAction =
  | { type: 'DEAL' }
  | { type: 'HIT' }
  | { type: 'STAND' }
  | { type: 'DOUBLE' };

// ============================================================================
// Création et mélange du jeu de cartes
// ============================================================================

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];

/** Source aléatoire : une fonction retournant un nombre dans [0, 1), comme Math.random. */
export type RandomSource = () => number;

/**
 * Crée un ou plusieurs jeux de 52 cartes (4 familles x 13 valeurs) et les mélange.
 * `numDecks` permet de simuler un sabot à plusieurs jeux (par défaut 1 seul jeu de 52 cartes).
 * `rng` est injectable pour pouvoir écrire des tests déterministes.
 */
export function createShoe(numDecks = 1, rng: RandomSource = Math.random): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit });
      }
    }
  }
  return shuffle(cards, rng);
}

/**
 * Mélange un tableau de façon aléatoire (algorithme de Fisher-Yates) sans modifier
 * le tableau d'origine. `rng` est injectable pour des tests déterministes.
 */
export function shuffle<T>(items: T[], rng: RandomSource = Math.random): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface DrawResult {
  card: Card;
  remaining: Card[];
}

/** Pioche la carte du dessus du sabot et retourne la carte piochée + le sabot restant. */
export function drawCard(shoe: Card[]): DrawResult {
  if (shoe.length === 0) {
    throw new Error('Cannot draw from an empty shoe');
  }
  const [card, ...remaining] = shoe;
  return { card, remaining };
}

// ============================================================================
// Calcul de la valeur d'une main
// ============================================================================

/** Valeur en points d'une carte : figures = 10, As = 11 (ajusté ensuite si besoin), sinon sa valeur numérique. */
function rankValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return Number(rank);
}

export interface HandValue {
  /** Meilleur total possible sans dépasser 21 si c'est faisable, sinon le total obtenu. */
  total: number;
  /** Vrai si un As est actuellement compté comme 11 dans `total` (main "souple"). */
  soft: boolean;
}

/**
 * Calcule la valeur d'une main en tenant compte de la règle spéciale de l'As (1 ou 11).
 * Chaque As compte d'abord pour 11, puis on le réduit à 1 autant de fois que nécessaire
 * pour éviter de dépasser 21, tant qu'il reste des As à réduire.
 */
export function handValue(cards: Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    total += rankValue(card.rank);
    if (card.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

/** Indique si une main a dépassé 21 (elle a "sauté"/"bust", donc elle est perdante). */
export function isBust(cards: Card[]): boolean {
  return handValue(cards).total > 21;
}

/** Indique si une main est un blackjack naturel : exactement 2 cartes totalisant 21. */
export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

/** Ajoute une carte à une main et retourne la nouvelle main (sans modifier l'originale). */
export function addCard(hand: Hand, card: Card): Hand {
  return { cards: [...hand.cards, card] };
}

// ============================================================================
// Logique du croupier
// ============================================================================

/** Le croupier s'arrête dès qu'il atteint 17, que ce soit un 17 "dur" ou "souple" (règle S17). */
const DEALER_STAND_TOTAL = 17;

export interface DealerPlayResult {
  hand: Hand;
  shoe: Card[];
}

/**
 * Fait jouer le croupier : il tire une carte tant que sa main est en dessous de 17,
 * puis s'arrête. Retourne sa main finale et ce qu'il reste du sabot.
 */
export function dealerPlay(dealerHand: Hand, shoe: Card[]): DealerPlayResult {
  let hand = dealerHand;
  let remainingShoe = shoe;
  while (handValue(hand.cards).total < DEALER_STAND_TOTAL) {
    const { card, remaining } = drawCard(remainingShoe);
    hand = { cards: [...hand.cards, card] };
    remainingShoe = remaining;
  }
  return { hand, shoe: remainingShoe };
}

// ============================================================================
// Détermination du gagnant et des gains
// ============================================================================

export interface ResolveParams {
  playerHand: Hand;
  dealerHand: Hand;
  /** Vrai si les 2 premières cartes du joueur formaient un blackjack naturel. */
  playerHasNatural: boolean;
  dealerHasNatural: boolean;
}

/**
 * Détermine qui a gagné la main, en appliquant les règles du blackjack dans l'ordre :
 * le joueur qui a sauté perd toujours ; sinon on compare les blackjacks naturels ;
 * sinon celui qui a sauté (croupier) ou le total le plus haut l'emporte ; égalité = push.
 */
export function resolveOutcome({
  playerHand,
  dealerHand,
  playerHasNatural,
  dealerHasNatural,
}: ResolveParams): Outcome {
  if (isBust(playerHand.cards)) return 'lose';
  if (playerHasNatural && dealerHasNatural) return 'push';
  if (playerHasNatural) return 'blackjack';
  if (dealerHasNatural) return 'lose';
  if (isBust(dealerHand.cards)) return 'win';

  const playerTotal = handValue(playerHand.cards).total;
  const dealerTotal = handValue(dealerHand.cards).total;
  if (playerTotal > dealerTotal) return 'win';
  if (playerTotal < dealerTotal) return 'lose';
  return 'push';
}

/**
 * Calcule le delta net de minutes à appliquer suite au résultat d'une main :
 * victoire normale payée 1:1, blackjack payé 3:2, push = mise rendue (delta 0),
 * défaite = perte de la mise entière (doublée si le joueur avait doublé).
 */
export function payoutForOutcome(
  outcome: Outcome,
  stakeMinutes: number,
  doubled = false,
): number {
  const effectiveStake = doubled ? stakeMinutes * 2 : stakeMinutes;
  switch (outcome) {
    case 'blackjack':
      return Math.round(effectiveStake * 1.5);
    case 'win':
      return effectiveStake;
    case 'push':
      return 0;
    case 'lose':
      return -effectiveStake;
    default:
      return 0;
  }
}

// ============================================================================
// Gestion de la partie (joueur et croupier)
// ============================================================================

/** Crée l'état initial d'une partie, avant toute distribution de cartes (phase "betting"). */
export function createInitialGameState(stakeMinutes: number, shoe: Card[]): GameState {
  return {
    shoe,
    playerHand: { cards: [] },
    dealerHand: { cards: [] },
    stakeMinutes,
    phase: 'betting',
    doubled: false,
  };
}

/** Construit l'état final d'une main réglée (phase "settled") avec son résultat et son gain. */
function settle(
  state: GameState,
  outcome: Outcome,
  shoe: Card[],
  playerCards: Card[],
  dealerCards: Card[],
): GameState {
  return {
    ...state,
    shoe,
    playerHand: { cards: playerCards },
    dealerHand: { cards: dealerCards },
    phase: 'settled',
    outcome,
    payoutMinutes: payoutForOutcome(outcome, state.stakeMinutes, state.doubled),
  };
}

/**
 * Le reducer principal du jeu : à partir d'un état et d'une action (DEAL, HIT, STAND, DOUBLE),
 * calcule le nouvel état de la partie. Gère la distribution initiale (avec vérification des
 * blackjacks naturels), les tirages du joueur, le tour du croupier, et le double.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // Distribue 2 cartes au joueur et 2 cartes au croupier, en alternance.
    // Si l'un des deux a un blackjack naturel, la main se termine immédiatement.
    case 'DEAL': {
      if (state.phase !== 'betting') return state;

      let shoe = state.shoe;
      const playerCards: Card[] = [];
      const dealerCards: Card[] = [];
      for (let i = 0; i < 2; i++) {
        const p = drawCard(shoe);
        playerCards.push(p.card);
        shoe = p.remaining;
        const d = drawCard(shoe);
        dealerCards.push(d.card);
        shoe = d.remaining;
      }

      const playerHasNatural = isBlackjack(playerCards);
      const dealerHasNatural = isBlackjack(dealerCards);

      if (playerHasNatural || dealerHasNatural) {
        const outcome = resolveOutcome({
          playerHand: { cards: playerCards },
          dealerHand: { cards: dealerCards },
          playerHasNatural,
          dealerHasNatural,
        });
        return settle(state, outcome, shoe, playerCards, dealerCards);
      }

      return {
        ...state,
        shoe,
        playerHand: { cards: playerCards },
        dealerHand: { cards: dealerCards },
        phase: 'playerTurn',
      };
    }

    // Le joueur tire une carte supplémentaire. S'il dépasse 21, il perd immédiatement.
    case 'HIT': {
      if (state.phase !== 'playerTurn') return state;
      const { card, remaining } = drawCard(state.shoe);
      const playerCards = [...state.playerHand.cards, card];
      if (isBust(playerCards)) {
        return settle(state, 'lose', remaining, playerCards, state.dealerHand.cards);
      }
      return {
        ...state,
        shoe: remaining,
        playerHand: { cards: playerCards },
        phase: 'playerTurn',
      };
    }

    // Le joueur double sa mise : il ne peut le faire qu'au tout premier coup (2 cartes,
    // jamais doublé). Il pioche exactement une carte de plus, puis c'est au croupier de jouer.
    case 'DOUBLE': {
      if (state.phase !== 'playerTurn' || state.playerHand.cards.length !== 2 || state.doubled) {
        return state;
      }
      const { card, remaining } = drawCard(state.shoe);
      const playerCards = [...state.playerHand.cards, card];
      const doubledState = { ...state, doubled: true };

      if (isBust(playerCards)) {
        return settle(doubledState, 'lose', remaining, playerCards, state.dealerHand.cards);
      }

      const { hand: dealerHand, shoe: shoeAfterDealer } = dealerPlay(state.dealerHand, remaining);
      const outcome = resolveOutcome({
        playerHand: { cards: playerCards },
        dealerHand,
        playerHasNatural: false,
        dealerHasNatural: false,
      });
      return settle(doubledState, outcome, shoeAfterDealer, playerCards, dealerHand.cards);
    }

    // Le joueur reste sur sa main actuelle : le croupier joue son tour puis la main est réglée.
    case 'STAND': {
      if (state.phase !== 'playerTurn') return state;
      const { hand: dealerHand, shoe } = dealerPlay(state.dealerHand, state.shoe);
      const outcome = resolveOutcome({
        playerHand: state.playerHand,
        dealerHand,
        playerHasNatural: false,
        dealerHasNatural: false,
      });
      return settle(state, outcome, shoe, state.playerHand.cards, dealerHand.cards);
    }

    default:
      return state;
  }
}

/** Vrai si le joueur peut encore tirer une carte (uniquement pendant son tour). */
export function canHit(state: GameState): boolean {
  return state.phase === 'playerTurn';
}

/** Vrai si le joueur peut rester sur sa main actuelle (uniquement pendant son tour). */
export function canStand(state: GameState): boolean {
  return state.phase === 'playerTurn';
}

/** Vrai si le joueur peut doubler sa mise (seulement au premier coup, avec 2 cartes, jamais doublé). */
export function canDouble(state: GameState): boolean {
  return state.phase === 'playerTurn' && state.playerHand.cards.length === 2 && !state.doubled;
}
