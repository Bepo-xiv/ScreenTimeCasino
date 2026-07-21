package com.screentimecasino.usagestats

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Native bridge giving the JS side (see src/blackjack/screenTimeTracker.ts) access to real
 * Android screen time via UsageStatsManager, plus the special "usage access" permission flow
 * that API requires.
 */
class UsageStatsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "UsageStatsModule"

  /**
   * Checks whether the user has granted the special "Usage access" permission
   * (PACKAGE_USAGE_STATS). Unlike normal runtime permissions, this one has no system dialog:
   * it can only be checked here and granted manually by the user in Settings.
   */
  @ReactMethod
  fun checkUsageAccessPermission(promise: Promise) {
    val context = reactApplicationContext
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = appOps.checkOpNoThrow(
      AppOpsManager.OPSTR_GET_USAGE_STATS,
      Process.myUid(),
      context.packageName,
    )
    promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
  }

  /**
   * Opens the system "Usage access" settings screen so the user can grant this app permission
   * to read usage stats. There is no callback for the grant itself: the JS side should re-check
   * with checkUsageAccessPermission() when the app returns to the foreground.
   */
  @ReactMethod
  fun openUsageAccessSettings() {
    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactApplicationContext.startActivity(intent)
  }

  /**
   * Reads, via UsageStatsManager, how many minutes a given app has actually been used in the
   * foreground today (since local midnight). Returns 0 if usage access hasn't been granted,
   * rather than throwing, since "no data yet" is a normal state the UI should just show as 0.
   */
  @ReactMethod
  fun getUsageMinutesToday(packageName: String, promise: Promise) {
    try {
      promise.resolve(UsageStatsReader.getUsageMinutesToday(reactApplicationContext, packageName))
    } catch (error: Exception) {
      promise.reject("USAGE_STATS_ERROR", error)
    }
  }
}
