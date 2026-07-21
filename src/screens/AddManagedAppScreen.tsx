import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { usageStatsBridge, type InstalledApp } from '../native/UsageStatsBridge';
import type { RootStackParamList } from '../navigation/types';
import { casino } from '../theme/casinoTheme';
import { addManagedApp, getManagedApps } from '../storage/configRepo';

type Props = NativeStackScreenProps<RootStackParamList, 'AddManagedApp'>;

const DEFAULT_BUDGET_MINUTES = 30;

export function AddManagedAppScreen({ navigation }: Props) {
  const [candidates, setCandidates] = useState<InstalledApp[]>([]);

  useEffect(() => {
    (async () => {
      const [installed, managed] = [await usageStatsBridge.getInstalledLaunchableApps(), getManagedApps()];
      const managedPackages = new Set(managed.map(a => a.packageName));
      setCandidates(installed.filter(app => !managedPackages.has(app.packageName)));
    })();
  }, []);

  function handleAdd(app: InstalledApp) {
    addManagedApp({ ...app, baseBudgetMinutes: DEFAULT_BUDGET_MINUTES });
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={candidates}
        keyExtractor={app => app.packageName}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Toutes les applications sont déjà gérées.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => handleAdd(item)}>
            <Text style={styles.icon}>{item.icon}</Text>
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
    color: casino.textSecondary,
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
    fontSize: 28,
    marginRight: 14,
  },
  label: {
    color: casino.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
