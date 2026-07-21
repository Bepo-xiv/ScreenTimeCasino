import { appStorage } from './mmkv';

export interface ManagedApp {
  packageName: string;
  label: string;
  /** Une URI `file://` vers l'icône réelle de l'app, mise en cache côté natif. */
  icon: string;
  baseBudgetMinutes: number;
}

const MANAGED_APPS_KEY = 'config:managedApps';

function readAll(): ManagedApp[] {
  const raw = appStorage.getString(MANAGED_APPS_KEY);
  return raw ? (JSON.parse(raw) as ManagedApp[]) : [];
}

function writeAll(apps: ManagedApp[]): void {
  appStorage.set(MANAGED_APPS_KEY, JSON.stringify(apps));
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
