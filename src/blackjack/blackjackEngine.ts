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

/**
 * Une main du joueur. Il n'y en a qu'une normalement, mais un split en crée une deuxième,
 * chacune jouée et réglée indépendamment avec sa propre mise (state.stakeMinutes, identique
 * pour les deux) et son propre doublage éventuel.
 */
export interface PlayerHandState {
  cards: Card[];
  doubled: boolean;
  /** Vrai quand le joueur a fini de jouer cette main (elle a sauté, il est resté, ou a doublé). */
  finished: boolean;
  /**
   * Vrai si cette main provient d'un split d'As : elle ne reçoit alors qu'une seule carte
   * supplémentaire et ne peut plus être jouée ensuite (règle standard du blackjack).
   */
  isSplitAces: boolean;
  /** Résultat et gain, connus seulement une fois la partie réglée (phase "settled"). */
  outcome?: Outcome;
  payoutMinutes?: number;
}

/** État complet d'une partie de blackjack à un instant donné. */
export interface GameState {
  shoe: Card[];
  playerHands: PlayerHandState[];
  /** Index de la main en cours de jeu dans playerHands (change après un split). */
  activeHandIndex: number;
  dealerHand: Hand;
  stakeMinutes: number;
  phase: GamePhase;
  /** Somme des gains/pertes de toutes les mains, connue une fois la partie réglée. */
  payoutMinutes?: number;
}

/** Actions que le joueur peut déclencher pendant une partie. */
export type GameAction =
  | { type: 'DEAL' }
  | { type: 'HIT' }
  | { type: 'STAND' }
  | { type: 'DOUBLE' }
  | { type: 'SPLIT' };

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

function newHand(cards: Card[] = []): PlayerHandState {
  return { cards, doubled: false, finished: false, isSplitAces: false };
}

/** Crée l'état initial d'une partie, avant toute distribution de cartes (phase "betting"). */
export function createInitialGameState(stakeMinutes: number, shoe: Card[]): GameState {
  return {
    shoe,
    playerHands: [newHand()],
    activeHandIndex: 0,
    dealerHand: { cards: [] },
    stakeMinutes,
    phase: 'betting',
  };
}

function activeHand(state: GameState): PlayerHandState {
  return state.playerHands[state.activeHandIndex];
}

/** Retourne playerHands avec la main active remplacée par `hand`. */
function withActiveHand(state: GameState, hand: PlayerHandState): PlayerHandState[] {
  return state.playerHands.map((h, i) => (i === state.activeHandIndex ? hand : h));
}

/**
 * Une fois la main active terminée (sautée, restée, ou doublée), passe à la main suivante
 * issue d'un split si elle existe (en lui distribuant sa 2e carte, et en la terminant aussitôt
 * si elle vient d'un split d'As), ou fait jouer le croupier et règle la partie s'il n'y a plus
 * de main à jouer.
 */
function advance(state: GameState): GameState {
  let index = state.activeHandIndex + 1;
  let hands = state.playerHands;
  let shoe = state.shoe;

  while (index < hands.length) {
    let hand = hands[index];
    if (hand.cards.length === 1) {
      const { card, remaining } = drawCard(shoe);
      hand = { ...hand, cards: [...hand.cards, card], finished: hand.isSplitAces };
      shoe = remaining;
      hands = hands.map((h, i) => (i === index ? hand : h));
    }
    if (!hand.finished) {
      return { ...state, playerHands: hands, shoe, activeHandIndex: index, phase: 'playerTurn' };
    }
    index++;
  }

  return resolveRound({ ...state, playerHands: hands, shoe });
}

/**
 * Fait jouer le croupier une seule fois, puis détermine le résultat et le gain de chaque main
 * du joueur face à lui (une main déjà sautée reste perdante quel que soit le jeu du croupier).
 * Si toutes les mains ont sauté, le croupier ne tire pas : le résultat est déjà joué.
 */
function resolveRound(state: GameState): GameState {
  const dealerNeedsToPlay = state.playerHands.some(hand => !isBust(hand.cards));
  const { hand: dealerHand, shoe } = dealerNeedsToPlay
    ? dealerPlay(state.dealerHand, state.shoe)
    : { hand: state.dealerHand, shoe: state.shoe };

  const playerHands = state.playerHands.map(hand => {
    const outcome = resolveOutcome({
      playerHand: { cards: hand.cards },
      dealerHand,
      playerHasNatural: false,
      dealerHasNatural: false,
    });
    return { ...hand, outcome, payoutMinutes: payoutForOutcome(outcome, state.stakeMinutes, hand.doubled) };
  });

  const payoutMinutes = playerHands.reduce((sum, hand) => sum + (hand.payoutMinutes ?? 0), 0);

  return { ...state, shoe, dealerHand, playerHands, phase: 'settled', payoutMinutes };
}

/**
 * Le reducer principal du jeu : à partir d'un état et d'une action (DEAL, HIT, STAND, DOUBLE,
 * SPLIT), calcule le nouvel état de la partie. Gère la distribution initiale (avec vérification
 * des blackjacks naturels), les tirages du joueur, le split, le tour du croupier et le règlement.
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
        const hand: PlayerHandState = {
          ...newHand(playerCards),
          finished: true,
          outcome,
          payoutMinutes: payoutForOutcome(outcome, state.stakeMinutes, false),
        };
        return {
          ...state,
          shoe,
          playerHands: [hand],
          dealerHand: { cards: dealerCards },
          phase: 'settled',
          payoutMinutes: hand.payoutMinutes,
        };
      }

      return {
        ...state,
        shoe,
        playerHands: [newHand(playerCards)],
        activeHandIndex: 0,
        dealerHand: { cards: dealerCards },
        phase: 'playerTurn',
      };
    }

    // Le joueur tire une carte supplémentaire sur sa main active. S'il dépasse 21, elle est
    // terminée (perdante) et on passe à la main suivante (split) ou on règle la partie.
    case 'HIT': {
      if (state.phase !== 'playerTurn') return state;
      const hand = activeHand(state);
      const { card, remaining } = drawCard(state.shoe);
      const cards = [...hand.cards, card];
      const busted = isBust(cards);
      const nextState = {
        ...state,
        shoe: remaining,
        playerHands: withActiveHand(state, { ...hand, cards, finished: busted }),
      };
      return busted ? advance(nextState) : nextState;
    }

    // Le joueur double sa mise sur la main active : possible seulement au premier coup (2
    // cartes, jamais doublé). Il pioche exactement une carte de plus, puis la main est terminée.
    case 'DOUBLE': {
      if (state.phase !== 'playerTurn') return state;
      const hand = activeHand(state);
      if (hand.cards.length !== 2 || hand.doubled) return state;

      const { card, remaining } = drawCard(state.shoe);
      const cards = [...hand.cards, card];
      const nextState = {
        ...state,
        shoe: remaining,
        playerHands: withActiveHand(state, { ...hand, cards, doubled: true, finished: true }),
      };
      return advance(nextState);
    }

    // Le joueur reste sur sa main active : elle est terminée, on passe à la suivante (split)
    // ou on fait jouer le croupier et on règle la partie.
    case 'STAND': {
      if (state.phase !== 'playerTurn') return state;
      const hand = activeHand(state);
      const nextState = { ...state, playerHands: withActiveHand(state, { ...hand, finished: true }) };
      return advance(nextState);
    }

    // Sépare une paire (2 cartes de même valeur) en deux mains indépendantes, chacune misant
    // le même montant. La première main reçoit aussitôt sa 2e carte ; la seconde ne recevra la
    // sienne qu'à son tour. Les As séparés ne reçoivent qu'une seule carte chacun (règle standard).
    case 'SPLIT': {
      if (state.phase !== 'playerTurn' || state.playerHands.length >= 2) return state;
      const hand = activeHand(state);
      if (hand.cards.length !== 2 || hand.cards[0].rank !== hand.cards[1].rank) return state;

      const [cardA, cardB] = hand.cards;
      const isSplitAces = cardA.rank === 'A';
      const { card: extraCard, remaining } = drawCard(state.shoe);

      const hand0: PlayerHandState = {
        cards: [cardA, extraCard],
        doubled: false,
        finished: isSplitAces,
        isSplitAces,
      };
      const hand1: PlayerHandState = { cards: [cardB], doubled: false, finished: false, isSplitAces };

      const nextState: GameState = {
        ...state,
        shoe: remaining,
        playerHands: [hand0, hand1],
        activeHandIndex: 0,
        phase: 'playerTurn',
      };
      return hand0.finished ? advance(nextState) : nextState;
    }

    default:
      return state;
  }
}

/** Vrai si le joueur peut encore tirer une carte sur la main active. */
export function canHit(state: GameState): boolean {
  return state.phase === 'playerTurn' && !activeHand(state).finished;
}

/** Vrai si le joueur peut rester sur sa main active. */
export function canStand(state: GameState): boolean {
  return state.phase === 'playerTurn' && !activeHand(state).finished;
}

/** Vrai si le joueur peut doubler sa mise sur la main active (2 cartes, jamais doublé). */
export function canDouble(state: GameState): boolean {
  if (state.phase !== 'playerTurn') return false;
  const hand = activeHand(state);
  return !hand.finished && hand.cards.length === 2 && !hand.doubled;
}

/**
 * Vrai si la main active peut être séparée : exactement 2 cartes de même valeur, et pas déjà
 * séparée une première fois (un seul split autorisé, pas de re-split).
 */
export function canSplit(state: GameState): boolean {
  if (state.phase !== 'playerTurn' || state.playerHands.length >= 2) return false;
  const hand = activeHand(state);
  return !hand.finished && hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank;
}
