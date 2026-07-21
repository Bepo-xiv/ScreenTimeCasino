/** Liste des écrans de l'app et des paramètres attendus par chacun. */
export type RootStackParamList = {
  Accueil: undefined;
  AppConfig: undefined;
  AddManagedApp: undefined;
  Jeu: { packageName: string };
  Historique: undefined;
};
