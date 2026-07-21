import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { checkUsageAccessPermission, requestUsageAccessPermission } from '../blackjack/screenTimeTracker';
import { checkAccessibilityServiceEnabled, debugEvaluateLockout, requestAccessibilityService } from '../native/BlockingBridge';
import type { RootStackParamList } from '../navigation/types';
import { casino, silverTextStyle } from '../theme/casinoTheme';
import { getManagedApps, removeManagedApp, updateManagedApp, type ManagedApp } from '../storage/configRepo';

type Props = NativeStackScreenProps<RootStackParamList, 'AppConfig'>;

const BUDGET_STEP = 5;

export function AppConfigScreen({ navigation }: Props) {
  const [apps, setApps] = useState<ManagedApp[]>([]);
  const [hasUsageAccess, setHasUsageAccess] = useState(true);
  const [hasAccessibilityService, setHasAccessibilityService] = useState(true);

  const load = useCallback(() => {
    setApps(getManagedApps());
    checkUsageAccessPermission().then(setHasUsageAccess);
    checkAccessibilityServiceEnabled().then(setHasAccessibilityService);
  }, []);

  useFocusEffect(load);

  function adjustBudget(packageName: string, delta: number) {
    const app = apps.find(a => a.packageName === packageName);
    if (!app) return;
    const next = Math.max(5, app.baseBudgetMinutes + delta);
    updateManagedApp(packageName, { baseBudgetMinutes: next });
    load();
  }

  async function debugApp(packageName: string) {
    const json = await debugEvaluateLockout(packageName);
    Alert.alert('Debug blocage', json);
  }

  return (
    <View style={styles.container}>
      {!hasUsageAccess && (
        <Pressable style={styles.permissionBanner} onPress={requestUsageAccessPermission}>
          <Text style={styles.permissionTitle}>Autoriser l'accès à l'utilisation</Text>
          <Text style={styles.permissionBody}>
            Sans cette permission, le temps d'écran réel ne peut pas être lu. Appuie ici pour l'activer
            dans les réglages.
          </Text>
        </Pressable>
      )}
      {!hasAccessibilityService && (
        <Pressable style={styles.permissionBanner} onPress={requestAccessibilityService}>
          <Text style={styles.permissionTitle}>Activer le blocage réel des applications</Text>
          <Text style={styles.permissionBody}>
            Sans ce service d'accessibilité, une app à temps épuisé reste utilisable. Appuie ici pour
            l'activer dans les réglages.
          </Text>
        </Pressable>
      )}
      <FlatList
        data={apps}
        keyExtractor={app => app.packageName}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucune application gérée pour le moment.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.icon}>
              <AppIcon icon={item.icon} label={item.label} size={28} />
            </View>
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
              <Pressable onPress={() => debugApp(item.packageName)} hitSlop={8}>
                <Text style={styles.debugLink}>Debug blocage</Text>
              </Pressable>
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
  permissionBanner: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: casino.surface,
    borderWidth: 1.5,
    borderColor: casino.gold,
    borderRadius: 16,
    padding: 14,
  },
  permissionTitle: {
    color: casino.gold,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  permissionBody: {
    ...silverTextStyle,
    fontSize: 13,
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
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  label: {
    ...silverTextStyle,
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
    ...silverTextStyle,
    fontSize: 13,
    marginHorizontal: 10,
  },
  debugLink: {
    color: casino.goldMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
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
