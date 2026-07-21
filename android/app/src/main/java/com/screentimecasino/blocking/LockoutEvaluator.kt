package com.screentimecasino.blocking

import android.content.Context
import android.util.Log
import com.screentimecasino.usagestats.UsageStatsReader
import java.time.LocalDate

private const val TAG = "LockoutEvaluator"

/**
 * Decides whether a managed app is currently blocked, using the exact same formula as the JS
 * side's `getAvailableMinutes` (src/blackjack/screenTimeTracker.ts) — NOT the separate betting
 * pool/grace formula, which only governs how much can still be *wagered*, not whether the app
 * can currently be used.
 */
object LockoutEvaluator {

  data class Result(val isBlocked: Boolean, val label: String?)

  /**
   * remaining = baseBudgetMinutes + bankedAdjustments - usedMinutesToday ; blocked when <= 0.
   * A stored balance record from a previous day counts as reset to 0 (matches the JS side's lazy
   * daily reset), but this function never writes anything back — persistence stays JS-only, so
   * two writers never race on the same store. Fails OPEN on any error: a bug here must never
   * brick an unrelated real app with no escape hatch visible from inside it.
   */
  fun evaluate(context: Context, packageName: String): Result {
    return try {
      val app = BlockStateStore.getManagedApps(context).find { it.packageName == packageName }
        ?: return Result(isBlocked = false, label = null)

      val balance = BlockStateStore.getBalance(context, packageName)
      val today = LocalDate.now().toString() // yyyy-MM-dd, local time — matches the JS reset key
      val bankedAdjustments = if (balance?.date == today) balance.bankedAdjustments else 0

      val used = UsageStatsReader.getUsageMinutesToday(context, packageName)
      val remaining = app.baseBudgetMinutes + bankedAdjustments - used

      Result(isBlocked = remaining <= 0, label = app.label)
    } catch (error: Exception) {
      Log.w(TAG, "Evaluation failed for $packageName, failing open (not blocked)", error)
      Result(isBlocked = false, label = null)
    }
  }
}
