package com.screentimecasino.blocking

import android.content.Context
import android.util.Log
import com.tencent.mmkv.MMKV
import org.json.JSONArray

private const val TAG = "BlockStateStore"
private const val MMKV_ID = "screen_time_casino_block_state"
private const val MANAGED_APPS_KEY = "config:managedApps"
private const val BALANCE_KEY_PREFIX = "screenTimeBalance:"

data class ManagedApp(val packageName: String, val label: String, val baseBudgetMinutes: Int)
data class BalanceRecord(val date: String, val bankedAdjustments: Int)

/**
 * Read-only native access to the exact same multi-process MMKV store the JS side
 * (src/storage/mmkv.ts's `blockState`) writes to — this is what lets a native service running
 * with no RN/JS bridge alive (see BlockAccessibilityService) still see current app configs and
 * balances. Never writes: JS remains the sole writer, to avoid two writers racing on one store.
 */
object BlockStateStore {

  @Volatile private var initialized = false

  @Synchronized
  private fun ensureInitialized(context: Context) {
    if (initialized) return
    // Must match react-native-mmkv's HybridMMKVPlatformContext.getBaseDirectory() exactly,
    // since that's the root the JS side actually writes under. Pinned explicitly rather than
    // relying on MMKV's own default happening to match.
    val rootDir = context.applicationContext.filesDir.absolutePath + "/mmkv"
    MMKV.initialize(rootDir)
    initialized = true
  }

  private fun store(context: Context): MMKV {
    ensureInitialized(context)
    return MMKV.mmkvWithID(MMKV_ID, MMKV.MULTI_PROCESS_MODE)
  }

  /** The list of apps currently tracked, with their configured daily budget. */
  fun getManagedApps(context: Context): List<ManagedApp> {
    val raw = store(context).decodeString(MANAGED_APPS_KEY) ?: return emptyList()
    val result = mutableListOf<ManagedApp>()
    try {
      val array = JSONArray(raw)
      for (i in 0 until array.length()) {
        // One malformed entry must not null out every other app's blocking behavior.
        try {
          val obj = array.getJSONObject(i)
          result.add(
            ManagedApp(
              packageName = obj.getString("packageName"),
              label = obj.optString("label", obj.getString("packageName")),
              baseBudgetMinutes = obj.getInt("baseBudgetMinutes"),
            ),
          )
        } catch (perAppError: Exception) {
          Log.w(TAG, "Skipping malformed managed app entry at index $i", perAppError)
        }
      }
    } catch (error: Exception) {
      Log.w(TAG, "Failed to parse managed apps list", error)
    }
    return result
  }

  /** The stored per-app balance record, or null if this app has never had one written yet. */
  fun getBalance(context: Context, packageName: String): BalanceRecord? {
    val raw = store(context).decodeString(BALANCE_KEY_PREFIX + packageName) ?: return null
    return try {
      val obj = org.json.JSONObject(raw)
      BalanceRecord(
        date = obj.getString("date"),
        bankedAdjustments = obj.getInt("bankedAdjustments"),
      )
    } catch (error: Exception) {
      Log.w(TAG, "Failed to parse balance record for $packageName", error)
      null
    }
  }
}
