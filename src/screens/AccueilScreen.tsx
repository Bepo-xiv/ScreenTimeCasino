import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppListItem } from '../components/AppListItem';
import type { RootStackParamList } from '../navigation/types';
import { getAvailableMinutes } from '../blackjack/screenTimeTracker';
import { casino } from '../theme/casinoTheme';
import { getManagedApps, type ManagedApp } from '../storage/configRepo';

type Props = NativeStackScreenProps<RootStackParamList, 'Accueil'>;

function HeaderActions({ onManage, onHistorique }: { onManage: () => void; onHistorique: () => void }) {
  return (
    <View style={styles.headerActions}>
      <Pressable onPress={onHistorique} hitSlop={12}>
        <Text style={styles.headerAction}>Historique</Text>
      </Pressable>
      <Pressable onPress={onManage} hitSlop={12}>
        <Text style={styles.headerAction}>Gérer</Text>
      </Pressable>
    </View>
  );
}

export function AccueilScreen({ navigation }: Props) {
  const [apps, setApps] = useState<ManagedApp[]>([]);
  const [remaining, setRemaining] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const managedApps = getManagedApps();
    setApps(managedApps);
    const entries = await Promise.all(
      managedApps.map(async app => [app.packageName, await getAvailableMinutes(app.packageName)] as const),
    );
    setRemaining(Object.fromEntries(entries));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components -- react-navigation's documented headerRight pattern
      headerRight: () => (
        <HeaderActions
          onManage={() => navigation.navigate('AppConfig')}
          onHistorique={() => navigation.navigate('Historique')}
        />
      ),
    });
  }, [navigation]);

  const totalRemaining = apps.reduce((sum, app) => sum + (remaining[app.packageName] ?? 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Solde total de temps</Text>
        <Text style={styles.heroValue}>{Math.max(0, totalRemaining)} min</Text>
      </View>

      <FlatList
        data={apps}
        keyExtractor={app => app.packageName}
        contentContainerStyle={styles.list}
        ListHeaderComponent={apps.length > 0 ? <Text style={styles.sectionTitle}>Vos applications</Text> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucune application gérée pour le moment.</Text>
            <Pressable onPress={() => navigation.navigate('AppConfig')}>
              <Text style={styles.emptyAction}>Ajoutes-en une pour commencer →</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <AppListItem
            app={item}
            remainingMinutes={remaining[item.packageName]}
            onPress={() => navigation.navigate('Jeu', { packageName: item.packageName })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: casino.background,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 28,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: casino.surface,
    borderWidth: 1,
    borderColor: casino.border,
  },
  heroLabel: {
    color: casino.textSecondary,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroValue: {
    color: casino.gold,
    fontSize: 40,
    fontWeight: '900',
  },
  list: {
    padding: 16,
  },
  sectionTitle: {
    color: casino.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 18,
  },
  headerAction: {
    color: casino.gold,
    fontSize: 14,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: casino.textSecondary,
    fontSize: 15,
    marginBottom: 8,
  },
  emptyAction: {
    color: casino.gold,
    fontSize: 15,
    fontWeight: '700',
  },
});
