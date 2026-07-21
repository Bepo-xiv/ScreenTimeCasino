package com.screentimecasino.blocking

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject

/**
 * RN bridge for the app-blocking AccessibilityService: the guided permission flow (there's no
 * runtime dialog for enabling an accessibility service, same constraint as usage access), plus a
 * debug method to inspect what the native side currently computes for a given app.
 */
class BlockingModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "BlockingModule"

  /**
   * Checks whether the user has enabled our AccessibilityService in system settings. Unlike a
   * normal runtime permission, this has no system dialog: it can only be checked here and
   * granted manually by the user in Settings.
   */
  @ReactMethod
  fun isAccessibilityServiceEnabled(promise: Promise) {
    val expected = ComponentName(reactApplicationContext, BlockAccessibilityService::class.java).flattenToString()
    val enabled = Settings.Secure.getString(
      reactApplicationContext.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
    ) ?: ""
    val isEnabled = enabled.split(':').any { it.equals(expected, ignoreCase = true) }
    promise.resolve(isEnabled)
  }

  /** Opens the system Accessibility settings screen so the user can enable the service manually. */
  @ReactMethod
  fun openAccessibilitySettings() {
    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactApplicationContext.startActivity(intent)
  }

  /**
   * Debug-only: returns what LockoutEvaluator currently computes for a given package, plus the
   * raw managed-app/balance data it read. Lets the JS side surface this in-app for comparison
   * against what the UI shows, since this environment has no adb logcat access to diagnose the
   * native <-> JS MMKV cross-process read any other way.
   */
  @ReactMethod
  fun debugEvaluate(packageName: String, promise: Promise) {
    val context = reactApplicationContext
    val app = BlockStateStore.getManagedApps(context).find { it.packageName == packageName }
    val balance = BlockStateStore.getBalance(context, packageName)
    val result = LockoutEvaluator.evaluate(context, packageName)

    val json = JSONObject().apply {
      put("packageName", packageName)
      put("managedAppFound", app != null)
      put("baseBudgetMinutes", app?.baseBudgetMinutes)
      put("balanceFound", balance != null)
      put("balanceDate", balance?.date)
      put("bankedAdjustments", balance?.bankedAdjustments)
      put("isBlocked", result.isBlocked)
      put("label", result.label)
    }
    promise.resolve(json.toString())
  }
}
