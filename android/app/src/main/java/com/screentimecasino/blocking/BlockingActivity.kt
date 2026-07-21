package com.screentimecasino.blocking

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Full-screen interrupt shown when a managed app whose time is exhausted is opened. Plain
 * Activity (no RN bootstrap, no XML layout) so it works even if the RN process is dead and
 * renders instantly. Declared singleInstance with an empty taskAffinity (see AndroidManifest.xml)
 * so it always lives alone in its own task rather than merging into the blocked app's stack.
 */
class BlockingActivity : Activity() {

  companion object {
    const val EXTRA_PACKAGE_NAME = "packageName"
    const val EXTRA_LABEL = "label"

    private const val COLOR_BACKGROUND = "#08080a"
    private const val COLOR_GOLD = "#d4af37"
    private const val COLOR_SILVER = "#c7cad2"
    private const val COLOR_LOSE = "#e0334d"
    private const val COLOR_BUTTON_TEXT = "#08080a"
  }

  private lateinit var titleView: TextView
  private lateinit var bodyView: TextView

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    buildLayout()
    renderFromIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    renderFromIntent(intent)
  }

  private fun buildLayout() {
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor(COLOR_BACKGROUND))
      val padding = dp(32)
      setPadding(padding, padding, padding, padding)
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }

    titleView = TextView(this).apply {
      setTextColor(Color.parseColor(COLOR_LOSE))
      textSize = 24f
      setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.CENTER
      text = "TEMPS ÉPUISÉ"
    }

    bodyView = TextView(this).apply {
      setTextColor(Color.parseColor(COLOR_SILVER))
      textSize = 16f
      gravity = Gravity.CENTER
      setPadding(0, dp(16), 0, dp(32))
    }

    val button = Button(this).apply {
      text = "Aller jouer au blackjack"
      setTextColor(Color.parseColor(COLOR_BUTTON_TEXT))
      setBackgroundColor(Color.parseColor(COLOR_GOLD))
      setPadding(dp(24), dp(14), dp(24), dp(14))
      setOnClickListener { openBlackjackTable() }
    }

    root.addView(titleView)
    root.addView(bodyView)
    root.addView(button)
    setContentView(root)
  }

  private fun renderFromIntent(intent: Intent) {
    val label = intent.getStringExtra(EXTRA_LABEL)
    bodyView.text = if (label != null) {
      "Le temps alloué à $label est épuisé. Gagne des minutes au blackjack pour continuer."
    } else {
      "Le temps alloué à cette application est épuisé. Gagne des minutes au blackjack pour continuer."
    }
  }

  private fun openBlackjackTable() {
    val packageName = intent.getStringExtra(EXTRA_PACKAGE_NAME)
    val uri = Uri.parse("screentimecasino://jeu/$packageName")
    startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    finish()
  }

  @Suppress("DEPRECATION")
  override fun onBackPressed() {
    startActivity(
      Intent(Intent.ACTION_MAIN)
        .addCategory(Intent.CATEGORY_HOME)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
    )
    finish()
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
