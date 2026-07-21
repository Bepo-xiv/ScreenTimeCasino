import { NativeModules, Platform } from 'react-native';
import { getManagedApp } from '../storage/configRepo';
import { blockState } from '../storage/mmkv';
import { payoutForOutcome } from './blackjackEngine';
import type { Outcome } from './blackjackEngine';

// ============================================================================
// Accès au module natif Android (UsageStatsManager)
// ============================================================================

/** Forme du module natif Kotlin (android/.../usagestats/UsageStatsModule.kt). */
interface UsageStatsNativeModule {
  checkUsageAccessPermission(): Promise<boolean>;
  openUsageAccessSettings(): void;
  getUsageMinutesToday(packageName: string): Promise<number>;
}

/**
 * Référence vers le module natif "UsageStatsModule". S'il n'est pas disponible (app pas encore
 * buildée avec le module, tests Jest, ou plateforme non-Android), on retombe sur un stub inerte
 * plutôt que de planter : le solde se comportera juste comme si 0 minute avait été utilisée.
 */
const nativeModule: UsageStatsNativeModule = NativeModules.UsageStatsModule ?? {
  async checkUsageAccessPermission() {
    return false;
  },
  openUsageAccessSettings() {},
  async getUsageMinutesToday() {
    return 0;
  },
};

/**
 * Vérifie si l'utilisateur a accordé la permission spéciale "Accès à l'utilisation"
 * (PACKAGE_USAGE_STATS), indispensable pour lire le vrai temps d'écran. Cette permission
 * ne peut pas être demandée via une popup classique.
 */
export function checkUsageAccessPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return Promise.resolve(false);
  return nativeModule.checkUsageAccessPermission();
}

/**
 * Ouvre l'écran système "Accès à l'utilisation" pour que l'utilisateur accorde la permission
 * manuellement. Il n'existe aucun callback natif pour être prévenu du résultat : il faut
 * rappeler checkUsageAccessPermission() quand l'app revient au premier plan.
 */
export function requestUsageAccessPermission(): void {
  if (Platform.OS !== 'android') return;
  nativeModule.openUsageAccessSettings();
}

/**
 * Lit, via l'API native Android UsageStatsManager, le temps réel d'utilisation d'une
 * application aujourd'hui (en minutes, depuis minuit). Retourne 0 tant que la permission
 * n'a pas été accordée, plutôt que d'échouer.
 */
export function getRealUsageMinutesToday(packageName: string): Promise<number> {
  if (Platform.OS !== 'android') return Promise.resolve(0);
  return nativeModule.getUsageMinutesToday(packageName);
}

// ============================================================================
// Solde de temps disponible à parier
// ============================================================================

interface BalanceRecord {
  date: string;
  /** Minutes gagnées ou perdues au blackjack aujourd'hui, en plus du budget de base de l'app. */
  bankedAdjustments: number;
}

/** Renvoie la date du jour au format yyyy-MM-dd, pour savoir quand réinitialiser le solde. */
function today(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function balanceKey(packageName: string): string {
  return `screenTimeBalance:${packageName}`;
}

/**
 * Lit le solde stocké pour une app, en le réinitialisant automatiquement à 0 si on a changé
 * de jour depuis la dernière lecture (le solde gagné/perdu repart de zéro chaque jour).
 */
function readBalanceRecord(packageName: string): BalanceRecord {
  const raw = blockState.getString(balanceKey(packageName));
  const record: BalanceRecord = raw ? JSON.parse(raw) : { date: today(), bankedAdjustments: 0 };
  if (record.date !== today()) {
    const reset: BalanceRecord = { date: today(), bankedAdjustments: 0 };
    blockState.set(balanceKey(packageName), JSON.stringify(reset));
    return reset;
  }
  return record;
}

function writeBalanceRecord(packageName: string, record: BalanceRecord): void {
  blockState.set(balanceKey(packageName), JSON.stringify(record));
}

/**
 * Calcule le solde de minutes disponibles à parier pour une app :
 * budget de base configuré + minutes gagnées/perdues au blackjack aujourd'hui
 * - temps réellement déjà utilisé aujourd'hui (toujours lu en direct via UsageStatsManager,
 * jamais stocké, pour ne jamais désynchroniser le solde de la réalité).
 */
export async function getAvailableMinutes(packageName: string): Promise<number> {
  const app = getManagedApp(packageName);
  const baseBudgetMinutes = app?.baseBudgetMinutes ?? 0;
  const { bankedAdjustments } = readBalanceRecord(packageName);
  const usedMinutes = await getRealUsageMinutesToday(packageName);
  return baseBudgetMinutes + bankedAdjustments - usedMinutes;
}

/** Ajoute des minutes au solde disponible d'une app. Appelé quand le joueur gagne une main. */
export function addTime(packageName: string, minutes: number): void {
  const record = readBalanceRecord(packageName);
  writeBalanceRecord(packageName, {
    date: record.date,
    bankedAdjustments: record.bankedAdjustments + minutes,
  });
}

/** Retire des minutes au solde disponible d'une app. Appelé quand le joueur perd une main. */
export function removeTime(packageName: string, minutes: number): void {
  const record = readBalanceRecord(packageName);
  writeBalanceRecord(packageName, {
    date: record.date,
    bankedAdjustments: record.bankedAdjustments - minutes,
  });
}

/**
 * Applique le résultat d'une main de blackjack au solde d'une app : ajoute les minutes gagnées
 * (victoire ou blackjack), retire la mise perdue (défaite), ne change rien en cas d'égalité
 * (push). Retourne le gain/perte net et le nouveau solde disponible.
 */
export async function applyHandResult(
  packageName: string,
  outcome: Outcome,
  stakeMinutes: number,
  doubled: boolean,
): Promise<{ payoutMinutes: number; remainingMinutes: number }> {
  const payoutMinutes = payoutForOutcome(outcome, stakeMinutes, doubled);
  if (payoutMinutes > 0) addTime(packageName, payoutMinutes);
  if (payoutMinutes < 0) removeTime(packageName, -payoutMinutes);
  const remainingMinutes = await getAvailableMinutes(packageName);
  return { payoutMinutes, remainingMinutes };
}
