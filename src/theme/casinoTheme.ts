/**
 * Palette "casino prestige" partagée par tous les écrans : fond sombre/charbon pour les écrans
 * de navigation, tapis vert profond pour la table de jeu, accents or, cartes noires à symboles
 * rouges/ivoire. Un seul fichier de couleurs pour éviter que chaque écran réinvente ses teintes.
 */
export const casino = {
  // Fond général de l'app (écrans hors table de jeu) : noir charbon, ambiance "lobby de casino".
  background: '#0c0c0e',
  // Panneaux, cartes de liste, champs.
  surface: '#17181b',
  surfaceAlt: '#1f2023',
  border: '#2a2b2e',

  // Tapis vert de la table de blackjack.
  tableFelt: '#0b3d24',
  tableFeltDark: '#062818',

  // Accent doré "prestige".
  gold: '#d4af37',
  goldMuted: '#a8862a',

  // Textes.
  textPrimary: '#f5f5f0',
  textSecondary: '#a8a29b',
  textMuted: '#6f6f68',

  // Cartes à jouer : fond noir, symboles rouges (cœur/carreau) ou ivoire (pique/trèfle).
  cardFace: '#161616',
  cardBorder: 'rgba(212, 175, 55, 0.45)',
  cardRed: '#e0334d',
  cardLight: '#f3ecd9',

  // Résultats de main.
  win: '#2fbf71',
  lose: '#e0334d',
  push: '#d4af37',
} as const;
