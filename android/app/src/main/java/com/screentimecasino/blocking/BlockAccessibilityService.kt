package com.screentimecasino.blocking

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

/**
 * Watches for foreground-app changes system-wide and redirects into BlockingActivity whenever
 * the app that just came to the foreground is a managed app whose time is exhausted. Runs in
 * its own process (see AndroidManifest.xml's android:process=":blocking" and
 * MainApplication.kt's process guard) so it keeps working even if the main RN process crashes
 * or is killed.
 */
class BlockAccessibilityService : AccessibilityService() {

  /** Tracks the last foreground package so we only re-evaluate on an actual app switch. */
  private var lastForegroundPackage: String? = null

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val packageName = event.packageName?.toString() ?: return

    // Our own app (including BlockingActivity itself) coming to the foreground must never be
    // evaluated — cheapest possible check, and prevents any chance of a self-block loop.
    if (packageName == applicationContext.packageName) {
      lastForegroundPackage = packageName
      return
    }
    if (packageName == lastForegroundPackage) return
    lastForegroundPackage = packageName

    val result = LockoutEvaluator.evaluate(applicationContext, packageName)
    if (result.isBlocked) {
      launchBlockingActivity(packageName, result.label)
    }
  }

  private fun launchBlockingActivity(packageName: String, label: String?) {
    val intent = Intent(this, BlockingActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK
      putExtra(BlockingActivity.EXTRA_PACKAGE_NAME, packageName)
      putExtra(BlockingActivity.EXTRA_LABEL, label)
    }
    startActivity(intent)
  }

  override fun onInterrupt() {
    // No ongoing feedback/resource to tear down.
  }
}
