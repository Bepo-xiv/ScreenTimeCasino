import { appStorage, blockState } from './mmkv';

export interface ManagedApp {
  packageName: string;
  label: string;
  /** Une URI `file://` vers l'icône réelle de l'app, mise en cache côté natif. */
  icon: string;
  baseBudgetMinutes: number;
}

const MANAGED_APPS_KEY = 'config:managedApps';

/**
 * La liste des apps gérées vivait auparavant dans `appStorage` (mono-processus). Elle doit
 * maintenant vivre dans `blockState` (multi-processus) pour que le futur service natif de
 * blocage puisse la lire directement. Migration à usage unique : si `blockState` n'a encore
 * rien sous cette clé, on recopie ce qui existait dans `appStorage`, sans jamais supprimer
 * l'ancienne clé (une clé orpheline est inoffensive, une suppression ratée ne l'est pas).
 */
function migrateFromLegacyStorageIfNeeded(): void {
  if (blockState.getString(MANAGED_APPS_KEY) != null) return;
  const legacy = appStorage.getString(MANAGED_APPS_KEY);
  if (legacy != null) {
    blockState.set(MANAGED_APPS_KEY, legacy);
  }
}
migrateFromLegacyStorageIfNeeded();

function readAll(): ManagedApp[] {
  const raw = blockState.getString(MANAGED_APPS_KEY);
  return raw ? (JSON.parse(raw) as ManagedApp[]) : [];
}

function writeAll(apps: ManagedApp[]): void {
  blockState.set(MANAGED_APPS_KEY, JSON.stringify(apps));
}

export function getManagedApps(): ManagedApp[] {
  return readAll();
}

export function getManagedApp(packageName: string): ManagedApp | undefined {
  return readAll().find(app => app.packageName === packageName);
}

export function addManagedApp(app: ManagedApp): void {
  const apps = readAll();
  if (apps.some(a => a.packageName === app.packageName)) {
    throw new Error(`${app.packageName} is already managed`);
  }
  writeAll([...apps, app]);
}

export function updateManagedApp(packageName: string, patch: Partial<ManagedApp>): void {
  const apps = readAll();
  writeAll(apps.map(a => (a.packageName === packageName ? { ...a, ...patch } : a)));
}

export function removeManagedApp(packageName: string): void {
  writeAll(readAll().filter(a => a.packageName !== packageName));
}
