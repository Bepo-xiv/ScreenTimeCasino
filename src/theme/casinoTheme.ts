/**
 * Palette "casino prestige" partagée par tous les écrans : fond noir profond, tapis vert pour la
 * table de jeu, accents or, cartes dorées à encre noire, textes argentés avec un léger reflet.
 * Un seul fichier de couleurs pour éviter que chaque écran réinvente ses teintes.
 */
export const casino = {
  // Fond général de l'app (écrans hors table de jeu) : noir profond, ambiance "lobby de casino".
  background: '#08080a',
  // Panneaux, cartes de liste, champs.
  surface: '#151519',
  surfaceAlt: '#1d1d22',
  border: '#2a2a30',

  // Tapis vert de la table de blackjack.
  tableFelt: '#0a3620',
  tableFeltDark: '#051f13',

  // Accent doré "prestige".
  gold: '#d4af37',
  goldMuted: '#a8862a',
  goldBright: '#f0d478',

  // Textes argentés, avec un ton plus clair utilisé en textShadow pour un léger reflet.
  silver: '#c7cad2',
  silverBright: '#f2f4f8',

  // Cartes à jouer : fond doré, symboles et chiffres en encre noire (aucune distinction de
  // couleur par famille). Le dos des cartes reste sombre à liseré or.
  cardFace: '#e7c766',
  cardFaceDark: '#cba53f',
  cardInk: '#1a1408',
  cardBack: '#0d0d10',

  // Jetons de mise, une couleur distincte par dénomination (convention casino classique).
  chipRed: '#b3253f',
  chipBlue: '#1d4fb0',
  chipGreen: '#1c8a4b',
  chipBlack: '#141416',

  // Résultats de main.
  win: '#2fbf71',
  lose: '#e0334d',
  push: '#d4af37',

  // Solde de temps intermédiaire (entre 0 et 10 min restantes).
  warning: '#e08a2e',
} as const;

/** Style de texte argenté avec un léger reflet (à combiner avec fontSize/fontWeight au besoin). */
export const silverTextStyle = {
  color: casino.silver,
  textShadowColor: 'rgba(255, 255, 255, 0.4)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
} as const;

/** Couleur de jeton par dénomination (minutes). Retombe sur l'or pour une valeur inconnue. */
export function chipColor(value: number): string {
  switch (value) {
    case 1:
      return casino.chipBlack;
    case 5:
      return casino.chipRed;
    case 10:
      return casino.chipBlue;
    case 30:
      return casino.chipGreen;
    default:
      return casino.gold;
  }
}
