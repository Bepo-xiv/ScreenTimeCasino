/**
 * Screen Time Casino
 *
 * Point d'entrée de l'app : importe tous les écrans, met en place la navigation entre eux,
 * et applique le thème "casino prestige" à la barre de statut et à l'en-tête de navigation.
 * La logique du jeu (src/blackjack/) et le solde de temps à jour sont affichés par les écrans
 * eux-mêmes (AccueilScreen et JeuScreen se rafraîchissent à chaque fois qu'ils reprennent le
 * focus, via useFocusEffect), donc le solde reste toujours synchronisé après chaque main jouée.
 *
 * @format
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RootStackParamList } from './src/navigation/types';
import { AccueilScreen } from './src/screens/AccueilScreen';
import { AddManagedAppScreen } from './src/screens/AddManagedAppScreen';
import { AppConfigScreen } from './src/screens/AppConfigScreen';
import { HistoriqueScreen } from './src/screens/HistoriqueScreen';
import { JeuScreen } from './src/screens/JeuScreen';
import { casino } from './src/theme/casinoTheme';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Thème "casino prestige" appliqué par React Navigation (en-têtes, fond, texte). */
const navigationTheme = {
  dark: true,
  colors: {
    primary: casino.gold,
    background: casino.background,
    card: casino.background,
    text: casino.silver,
    border: casino.border,
    notification: casino.gold,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
};

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={casino.background} />
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: casino.background },
            headerTintColor: casino.silver,
            headerShadowVisible: false,
          }}>
          {/* Accueil : solde de temps par app + bouton "Jouer" vers la table de blackjack. */}
          <Stack.Screen name="Accueil" component={AccueilScreen} options={{ title: 'Screen Time Casino' }} />
          {/* Gestion des apps suivies et de leur budget quotidien. */}
          <Stack.Screen name="AppConfig" component={AppConfigScreen} options={{ title: 'Gérer les applications' }} />
          <Stack.Screen
            name="AddManagedApp"
            component={AddManagedAppScreen}
            options={{ title: 'Ajouter une app' }}
          />
          {/* La table de blackjack : cartes, mise, actions, connectée à screenTimeTracker. */}
          <Stack.Screen name="Jeu" component={JeuScreen} options={{ title: 'Blackjack' }} />
          {/* Historique de toutes les mains jouées aujourd'hui. */}
          <Stack.Screen name="Historique" component={HistoriqueScreen} options={{ title: 'Historique du jour' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
