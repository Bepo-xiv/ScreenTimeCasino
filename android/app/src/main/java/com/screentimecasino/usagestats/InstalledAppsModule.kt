package com.screentimecasino.usagestats

import android.content.Intent
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import java.io.File
import java.io.FileOutputStream

/**
 * Lists the real apps installed on the phone (the ones with a launcher icon), so the user picks
 * from what's actually there instead of a hardcoded catalog. Backs the "add an app" screen.
 */
class InstalledAppsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "InstalledAppsModule"

  @ReactMethod
  fun getInstalledLaunchableApps(promise: Promise) {
    try {
      val packageManager = reactApplicationContext.packageManager
      val ownPackageName = reactApplicationContext.packageName

      val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      val resolved: List<ResolveInfo> = packageManager.queryIntentActivities(launcherIntent, 0)

      val iconsDir = File(reactApplicationContext.cacheDir, "app_icons").apply { mkdirs() }

      val seenPackages = HashSet<String>()
      val result: WritableArray = Arguments.createArray()

      for (info in resolved) {
        val packageName = info.activityInfo.packageName
        if (packageName == ownPackageName || !seenPackages.add(packageName)) continue

        val label = info.loadLabel(packageManager).toString()
        val iconUri = cacheIcon(iconsDir, packageName, info.loadIcon(packageManager))

        val entry = Arguments.createMap()
        entry.putString("packageName", packageName)
        entry.putString("label", label)
        entry.putString("icon", iconUri)
        result.pushMap(entry)
      }

      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("INSTALLED_APPS_ERROR", error)
    }
  }

  /** Writes the app's icon to disk once (skipped on later calls) and returns a file:// URI. */
  private fun cacheIcon(iconsDir: File, packageName: String, drawable: Drawable): String {
    val file = File(iconsDir, "$packageName.png")
    if (!file.exists()) {
      val bitmap = drawableToBitmap(drawable)
      FileOutputStream(file).use { out -> bitmap.compress(Bitmap.CompressFormat.PNG, 100, out) }
    }
    return Uri.fromFile(file).toString()
  }

  private fun drawableToBitmap(drawable: Drawable): Bitmap {
    if (drawable is BitmapDrawable) return drawable.bitmap

    val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 96
    val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 96
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, canvas.width, canvas.height)
    drawable.draw(canvas)
    return bitmap
  }
}
