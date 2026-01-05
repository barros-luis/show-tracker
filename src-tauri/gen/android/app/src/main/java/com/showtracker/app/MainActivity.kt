package com.showtracker.app

import android.content.Intent
import android.os.Bundle
import android.util.Log

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val data = intent.data
    Log.d("ShowTrackerNative", "onCreate intent data: $data")
  }

  // Handle deep links when the Activity is already running (singleTask mode)
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    
    val data = intent.data
    Log.d("ShowTrackerNative", "onNewIntent called data: $data")
  }

  override fun onResume() {
      super.onResume()
      Log.d("ShowTrackerNative", "onResume called")
  }
}




