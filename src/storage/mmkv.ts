import { createMMKV } from 'react-native-mmkv';

/** General app data: managed-app config and hand history. */
export const appStorage = createMMKV({ id: 'app-storage' });

/**
 * Per-app daily budget adjustments. Kept in a dedicated multi-process instance so the
 * (future) native AccessibilityService can read it directly, without depending on the JS
 * bridge being alive.
 */
export const blockState = createMMKV({
  id: 'screen_time_casino_block_state',
  mode: 'multi-process',
});
