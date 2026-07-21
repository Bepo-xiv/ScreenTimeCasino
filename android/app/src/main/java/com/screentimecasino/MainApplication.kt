package com.screentimecasino

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.screentimecasino.blocking.BlockingPackage
import com.screentimecasino.usagestats.UsageStatsPackage
import java.io.IOException
import java.io.RandomAccessFile

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(UsageStatsPackage())
          add(BlockingPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // The accessibility service (BlockAccessibilityService) runs in a separate ":blocking"
    // process for crash isolation from the main RN process, which means Android instantiates
    // this same Application class there too and calls onCreate(). Booting the whole RN runtime
    // (JS bundle, Hermes/JSI) in that secondary process would be pointless. minSdkVersion=26
    // predates Application.getProcessName() (API 28), hence reading /proc/self/cmdline instead —
    // works identically across all supported API levels, no SDK_INT branching needed. On any
    // ambiguity (null), default to booting RN normally: failing to boot RN in the real main
    // process is catastrophic, while wrongly booting it in :blocking only wastes some memory.
    val processName = currentProcessName()
    if (processName == null || processName == packageName) {
      loadReactNative(this)
    }
  }

  private fun currentProcessName(): String? = try {
    RandomAccessFile("/proc/self/cmdline", "r").use { file ->
      val buffer = ByteArray(256)
      val length = file.read(buffer)
      if (length <= 0) {
        null
      } else {
        var end = 0
        while (end < length && buffer[end] != 0.toByte()) end++
        String(buffer, 0, end, Charsets.US_ASCII)
      }
    }
  } catch (error: IOException) {
    null
  }
}
