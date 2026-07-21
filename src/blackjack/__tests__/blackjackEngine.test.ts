import { createShoe, drawCard, handValue, isBlackjack, isBust, shuffle } from '../blackjackEngine';
import type { Card } from '../blackjackEngine';

const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });

describe('création des cartes', () => {
  it('crée un jeu de 52 cartes uniques pour un seul deck', () => {
    const shoe = createShoe(1);
    expect(shoe).toHaveLength(52);
    const unique = new Set(shoe.map(card => `${card.rank}-${card.suit}`));
    expect(unique.size).toBe(52);
  });

  it('crée 104 cartes pour deux decks', () => {
    const shoe = createShoe(2);
    expect(shoe).toHaveLength(104);
  });

  it('contient bien les 4 familles et les 13 valeurs', () => {
    const shoe = createShoe(1);
    const suits = new Set(shoe.map(card => card.suit));
    const ranks = new Set(shoe.map(card => card.rank));
    expect(suits).toEqual(new Set(['spades', 'hearts', 'diamonds', 'clubs']));
    expect(ranks.size).toBe(13);
  });

  it('drawCard retire et retourne la carte du dessus du sabot', () => {
    const shoe = createShoe(1);
    const top = shoe[0];
    const { card, remaining } = drawCard(shoe);
    expect(card).toEqual(top);
    expect(remaining).toHaveLength(51);
  });

  it('drawCard lève une erreur sur un sabot vide', () => {
    expect(() => drawCard([])).toThrow();
  });
});

describe('mélange des cartes', () => {
  it('produit un ordre différent de l’ordre de création (mélange réel)', () => {
    const ordered: Card[] = [];
    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
      for (const rank of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const) {
        ordered.push({ rank, suit });
      }
    }
    const shuffled = shuffle(ordered, Math.random);
    expect(shuffled).toHaveLength(ordered.length);
    // Toujours les mêmes 52 cartes, juste dans un ordre différent.
    expect(new Set(shuffled.map(card => `${card.rank}-${card.suit}`))).toEqual(
      new Set(ordered.map(card => `${card.rank}-${card.suit}`)),
    );
    expect(shuffled).not.toEqual(ordered);
  });

  it('est déterministe pour une même séquence aléatoire (rng injectable, utile pour les tests)', () => {
    const items = [1, 2, 3, 4, 5];
    const sequence = [0.9, 0.1, 0.5, 0.3, 0.7];
    let i = 0;
    const rng = () => sequence[i++ % sequence.length];

    const a = shuffle(items, rng);
    i = 0;
    const b = shuffle(items, rng);
    expect(a).toEqual(b);
  });

  it('ne modifie pas le tableau d’origine', () => {
    const items = [1, 2, 3];
    const copy = [...items];
    shuffle(items, () => 0.5);
    expect(items).toEqual(copy);
  });
});

describe('calcul de la valeur d’une main', () => {
  it('additionne simplement les cartes sans As', () => {
    expect(handValue([c('10'), c('7')])).toEqual({ total: 17, soft: false });
  });

  it('compte un As comme 11 quand c’est possible (main "souple")', () => {
    expect(handValue([c('A'), c('6')])).toEqual({ total: 17, soft: true });
  });

  it('réduit un As à 1 pour éviter de dépasser 21', () => {
    expect(handValue([c('A'), c('9'), c('5')])).toEqual({ total: 15, soft: false });
  });

  it('gère plusieurs As dans la même main', () => {
    expect(handValue([c('A'), c('A'), c('9')])).toEqual({ total: 21, soft: true });
    expect(handValue([c('A'), c('A'), c('9'), c('9')])).toEqual({ total: 20, soft: false });
  });

  it('les figures (J, Q, K) valent 10', () => {
    expect(handValue([c('J'), c('Q')])).toEqual({ total: 20, soft: false });
  });
});

describe('détection du 21 (blackjack naturel)', () => {
  it('reconnaît un blackjack : As + carte de valeur 10, en 2 cartes', () => {
    expect(isBlackjack([c('A'), c('K')])).toBe(true);
    expect(isBlackjack([c('A'), c('10')])).toBe(true);
  });

  it('un 21 obtenu avec plus de 2 cartes n’est pas un blackjack naturel', () => {
    expect(isBlackjack([c('7'), c('7'), c('7')])).toBe(false);
  });

  it('une main de 2 cartes sous 21 n’est pas un blackjack', () => {
    expect(isBlackjack([c('10'), c('9')])).toBe(false);
  });
});

describe('détection du bust (main perdante au-delà de 21)', () => {
  it('n’est pas bust à 21 ou en dessous', () => {
    expect(isBust([c('10'), c('J')])).toBe(false);
    expect(isBust([c('7'), c('7'), c('7')])).toBe(false);
  });

  it('est bust au-delà de 21', () => {
    expect(isBust([c('10'), c('J'), c('5')])).toBe(true);
  });

  it('un As permet d’éviter le bust tant que c’est possible', () => {
    // A + 9 + 5 = 15 (l'As compte pour 1, pas 11) : pas bust.
    expect(isBust([c('A'), c('9'), c('5')])).toBe(false);
  });
});
