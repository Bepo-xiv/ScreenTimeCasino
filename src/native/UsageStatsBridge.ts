/**
 * Mock catalog of installed apps for the "add an app to manage" picker. Real permission
 * checking and screen-time reading now live in `src/blackjack/screenTimeTracker.ts`, backed by
 * the native `UsageStatsModule` (Kotlin). Listing real installed apps (via PackageManager) is
 * still a planned follow-up, kept separate since it's a different concern from tracking time.
 */

export interface InstalledApp {
  packageName: string;
  label: string;
  /** Emoji placeholder in the mock; a `file://` icon URI once installed-app listing is real. */
  icon: string;
}

const MOCK_CATALOG: InstalledApp[] = [
  { packageName: 'com.instagram.android', label: 'Instagram', icon: '📷' },
  { packageName: 'com.zhiliaoapp.musically', label: 'TikTok', icon: '🎵' },
  { packageName: 'com.google.android.youtube', label: 'YouTube', icon: '▶️' },
  { packageName: 'com.twitter.android', label: 'X', icon: '🐦' },
  { packageName: 'com.reddit.frontpage', label: 'Reddit', icon: '👽' },
  { packageName: 'com.snapchat.android', label: 'Snapchat', icon: '👻' },
];

export interface UsageStatsBridge {
  getInstalledLaunchableApps(): Promise<InstalledApp[]>;
}

export const usageStatsBridge: UsageStatsBridge = {
  async getInstalledLaunchableApps() {
    return MOCK_CATALOG;
  },
};
