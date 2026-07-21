import { appStorage } from './mmkv';

export interface ManagedApp {
  packageName: string;
  label: string;
  /**
   * Mock milestone (M1-M3): an emoji placeholder. Once the real Usage Stats native module
   * lands (M4) this becomes a `file://` URI to a cached app icon — callers should render
   * either transparently by checking for the `file://` prefix.
   */
  icon: string;
  baseBudgetMinutes: number;
}

const MANAGED_APPS_KEY = 'config:managedApps';

const DEFAULT_MANAGED_APPS: ManagedApp[] = [
  { packageName: 'com.instagram.android', label: 'Instagram', icon: '📷', baseBudgetMinutes: 45 },
  { packageName: 'com.zhiliaoapp.musically', label: 'TikTok', icon: '🎵', baseBudgetMinutes: 30 },
  { packageName: 'com.google.android.youtube', label: 'YouTube', icon: '▶️', baseBudgetMinutes: 60 },
];

function readAll(): ManagedApp[] {
  const raw = appStorage.getString(MANAGED_APPS_KEY);
  if (!raw) {
    appStorage.set(MANAGED_APPS_KEY, JSON.stringify(DEFAULT_MANAGED_APPS));
    return DEFAULT_MANAGED_APPS;
  }
  return JSON.parse(raw) as ManagedApp[];
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
