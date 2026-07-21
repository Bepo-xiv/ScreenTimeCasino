/**
 * Manual Jest mock for react-native-mmkv. The real library eagerly touches the native
 * NitroModules bridge as soon as it's imported (even though it branches to its own JS mock
 * internally for callers), which crashes under Jest with no device/native binary present.
 * This in-memory stand-in keeps repos that call `new MMKV(...)` / `.set` / `.getString`
 * testable in plain Node.
 */
export interface MMKVConfiguration {
  id?: string;
  path?: string;
  encryptionKey?: string;
  mode?: 'single-process' | 'multi-process';
}

class MMKV {
  private store = new Map<string, string>();

  constructor(_config?: MMKVConfiguration) {}

  set(key: string, value: string | number | boolean): void {
    this.store.set(key, String(value));
  }

  getString(key: string): string | undefined {
    return this.store.get(key);
  }

  getNumber(key: string): number | undefined {
    const value = this.store.get(key);
    return value === undefined ? undefined : Number(value);
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.store.get(key);
    return value === undefined ? undefined : value === 'true';
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  contains(key: string): boolean {
    return this.store.has(key);
  }

  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }

  clearAll(): void {
    this.store.clear();
  }
}

export function createMMKV(config?: MMKVConfiguration): MMKV {
  return new MMKV(config);
}
