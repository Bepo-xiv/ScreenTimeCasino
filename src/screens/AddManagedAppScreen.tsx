import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { usageStatsBridge, type InstalledApp } from '../native/UsageStatsBridge';
import type { RootStackParamList } from '../navigation/types';
import { casino, silverTextStyle } from '../theme/casinoTheme';
import { addManagedApp, getManagedApps } from '../storage/configRepo';

type Props = NativeStackScreenProps<RootStackParamList, 'AddManagedApp'>;

const DEFAULT_BUDGET_MINUTES = 30;

export function AddManagedAppScreen({ navigation }: Props) {
  const [candidates, setCandidates] = useState<InstalledApp[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const installed = await usageStatsBridge.getInstalledLaunchableApps();
        const managedPackages = new Set(getManagedApps().map(a => a.packageName));
        setCandidates(installed.filter(app => !managedPackages.has(app.packageName)));
      } catch (err) {
        console.error('Failed to list installed apps', err);
        setError(true);
        setCandidates([]);
      }
    })();
  }, []);

  function handleAdd(app: InstalledApp) {
    addManagedApp({ ...app, baseBudgetMinutes: DEFAULT_BUDGET_MINUTES });
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={candidates ?? []}
        keyExtractor={app => app.packageName}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          candidates === null ? null : (
            <Text style={styles.emptyText}>
              {error
                ? 'Impossible de charger les applications installées. Réessaie plus tard.'
                : 'Toutes les applications sont déjà gérées.'}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => handleAdd(item)}>
            <View style={styles.icon}>
              <AppIcon icon={item.icon} label={item.label} size={28} />
            </View>
            <Text style={styles.label}>{item.label}</Text>
          </Pressable>
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
  list: {
    padding: 16,
  },
  emptyText: {
    ...silverTextStyle,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: casino.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: casino.border,
    padding: 14,
    marginBottom: 10,
  },
  icon: {
    marginRight: 14,
  },
  label: {
    ...silverTextStyle,
    fontSize: 16,
    fontWeight: '700',
  },
});
