import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import { casino } from '../theme/casinoTheme';
import { getManagedApps, removeManagedApp, updateManagedApp, type ManagedApp } from '../storage/configRepo';

type Props = NativeStackScreenProps<RootStackParamList, 'AppConfig'>;

const BUDGET_STEP = 5;

export function AppConfigScreen({ navigation }: Props) {
  const [apps, setApps] = useState<ManagedApp[]>([]);

  const load = useCallback(() => {
    setApps(getManagedApps());
  }, []);

  useFocusEffect(load);

  function adjustBudget(packageName: string, delta: number) {
    const app = apps.find(a => a.packageName === packageName);
    if (!app) return;
    const next = Math.max(5, app.baseBudgetMinutes + delta);
    updateManagedApp(packageName, { baseBudgetMinutes: next });
    load();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={apps}
        keyExtractor={app => app.packageName}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucune application gérée pour le moment.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.icon}>{item.icon}</Text>
            <View style={styles.info}>
              <Text style={styles.label}>{item.label}</Text>
              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => adjustBudget(item.packageName, -BUDGET_STEP)}
                  hitSlop={8}>
                  <Text style={styles.stepperGlyph}>−</Text>
                </Pressable>
                <Text style={styles.budgetValue}>{item.baseBudgetMinutes} min/jour</Text>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => adjustBudget(item.packageName, BUDGET_STEP)}
                  hitSlop={8}>
                  <Text style={styles.stepperGlyph}>+</Text>
                </Pressable>
              </View>
            </View>
            <Pressable
              onPress={() => {
                removeManagedApp(item.packageName);
                load();
              }}
              hitSlop={8}>
              <Text style={styles.remove}>Retirer</Text>
            </Pressable>
          </View>
        )}
      />
      <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddManagedApp')}>
        <Text style={styles.addButtonText}>+ Ajouter une application</Text>
      </Pressable>
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
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  label: {
    color: casino.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: casino.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperGlyph: {
    color: casino.gold,
    fontSize: 18,
    fontWeight: '700',
  },
  budgetValue: {
    color: casino.textSecondary,
    fontSize: 13,
    marginHorizontal: 10,
  },
  remove: {
    color: casino.lose,
    fontSize: 13,
    fontWeight: '700',
  },
  addButton: {
    margin: 16,
    backgroundColor: casino.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: {
    color: casino.background,
    fontSize: 16,
    fontWeight: '800',
  },
});
