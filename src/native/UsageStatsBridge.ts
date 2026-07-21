import { NativeModules, Platform } from 'react-native';

export interface InstalledApp {
  packageName: string;
  label: string;
  /** Une URI `file://` vers l'icône réelle de l'app, mise en cache côté natif. */
  icon: string;
}

interface InstalledAppsNativeModule {
  getInstalledLaunchableApps(): Promise<InstalledApp[]>;
}

/**
 * Référence vers le module natif "InstalledAppsModule"
 * (android/.../usagestats/InstalledAppsModule.kt). S'il n'est pas disponible (tests Jest,
 * plateforme non-Android), on retombe sur une liste vide plutôt que de planter.
 */
const nativeModule: InstalledAppsNativeModule = NativeModules.InstalledAppsModule ?? {
  async getInstalledLaunchableApps() {
    return [];
  },
};

export interface UsageStatsBridge {
  getInstalledLaunchableApps(): Promise<InstalledApp[]>;
}

export const usageStatsBridge: UsageStatsBridge = {
  async getInstalledLaunchableApps() {
    if (Platform.OS !== 'android') return [];
    return nativeModule.getInstalledLaunchableApps();
  },
};
