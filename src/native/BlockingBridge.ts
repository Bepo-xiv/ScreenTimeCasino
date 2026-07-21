import { NativeModules, Platform } from 'react-native';

/** Forme du module natif Kotlin (android/.../blocking/BlockingModule.kt). */
interface BlockingNativeModule {
  isAccessibilityServiceEnabled(): Promise<boolean>;
  openAccessibilitySettings(): void;
  debugEvaluate(packageName: string): Promise<string>;
}

/**
 * Référence vers le module natif "BlockingModule". S'il n'est pas disponible (app pas encore
 * buildée avec le module, tests Jest, ou plateforme non-Android), on retombe sur un stub inerte.
 */
const nativeModule: BlockingNativeModule = NativeModules.BlockingModule ?? {
  async isAccessibilityServiceEnabled() {
    return false;
  },
  openAccessibilitySettings() {},
  async debugEvaluate() {
    return '{}';
  },
};

/**
 * Vérifie si l'utilisateur a activé le service d'accessibilité qui bloque réellement les
 * applications à temps épuisé. Comme pour l'accès à l'utilisation, il n'existe aucune popup
 * classique : seul l'utilisateur peut l'activer manuellement dans les réglages.
 */
export function checkAccessibilityServiceEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android') return Promise.resolve(false);
  return nativeModule.isAccessibilityServiceEnabled();
}

/** Ouvre l'écran système "Accessibilité" pour que l'utilisateur active le service manuellement. */
export function requestAccessibilityService(): void {
  if (Platform.OS !== 'android') return;
  nativeModule.openAccessibilitySettings();
}

/**
 * Débogage uniquement : renvoie ce que le service natif calcule actuellement pour une app
 * (solde, date, verrouillage), pour vérifier que la lecture MMKV multi-processus fonctionne
 * bien sans avoir besoin d'un accès adb/logcat.
 */
export function debugEvaluateLockout(packageName: string): Promise<string> {
  if (Platform.OS !== 'android') return Promise.resolve('{}');
  return nativeModule.debugEvaluate(packageName);
}
