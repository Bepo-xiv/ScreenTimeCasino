package com.screentimecasino.usagestats

import android.app.usage.UsageStatsManager
import android.content.Context
import java.util.Calendar

/**
 * Reads real Android screen time via UsageStatsManager. Extracted as a plain-Context function
 * (not tied to ReactApplicationContext) so both the RN bridge (UsageStatsModule) and the native
 * blocking service (which has no RN dependency at all) can share one implementation instead of
 * two that could drift apart.
 */
object UsageStatsReader {

  /**
   * How many minutes a given app has actually been used in the foreground today (since local
   * midnight). Returns 0 if usage access hasn't been granted or there's no data yet, rather
   * than throwing — callers decide how to handle genuinely unexpected errors.
   */
  fun getUsageMinutesToday(context: Context, packageName: String): Int {
    val usageStatsManager =
      context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

    val startOfDay = Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, 0)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }.timeInMillis
    val now = System.currentTimeMillis()

    val stats = usageStatsManager.queryUsageStats(
      UsageStatsManager.INTERVAL_DAILY,
      startOfDay,
      now,
    )

    val totalForegroundMillis = stats
      ?.filter { it.packageName == packageName }
      ?.sumOf { it.totalTimeInForeground }
      ?: 0L

    return (totalForegroundMillis / 60_000L).toInt()
  }
}
