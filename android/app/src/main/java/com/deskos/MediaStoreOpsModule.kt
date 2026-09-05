package com.deskos

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.content.IntentSender
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Trash and move-to-album both need a signed-off IntentSender on API 30+
 * (MediaStore won't let an app mutate media it doesn't own otherwise), so
 * every pending request is stashed here keyed by request code and resolved
 * from onActivityResult.
 */
class MediaStoreOpsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var nextRequestCode = 9200
  private val pending = mutableMapOf<Int, Promise>()

  private val activityEventListener: ActivityEventListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        val promise = pending.remove(requestCode) ?: return
        if (resultCode == Activity.RESULT_OK) {
          promise.resolve(true)
        } else {
          promise.reject("USER_DENIED", "User declined the MediaStore permission request")
        }
      }
    }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  override fun getName() = "MediaStoreOps"

  @ReactMethod
  fun trashPhoto(uriString: String, promise: Promise) {
    val activity = currentActivityOrReject(promise) ?: return
    val uri = Uri.parse(uriString)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        val pendingIntent =
          MediaStore.createTrashRequest(reactContext.contentResolver, listOf(uri), true)
        launch(activity, pendingIntent.intentSender, promise)
      } catch (e: Exception) {
        promise.reject("TRASH_FAILED", e)
      }
    } else {
      deleteDirectly(uri, promise)
    }
  }

  @ReactMethod
  fun moveToAlbum(uriString: String, albumName: String, promise: Promise) {
    val activity = currentActivityOrReject(promise) ?: return
    val uri = Uri.parse(uriString)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        val pendingIntent =
          MediaStore.createWriteRequest(reactContext.contentResolver, listOf(uri))
        // Resolve the actual move only after the user grants write access.
        val code = registerRequest(promise) { doMove(uri, albumName, promise) }
        activity.startIntentSenderForResult(pendingIntent.intentSender, code, null, 0, 0, 0)
      } catch (e: Exception) {
        promise.reject("MOVE_FAILED", e)
      }
    } else {
      doMove(uri, albumName, promise)
    }
  }

  // API 30+ delivers the write grant via onActivityResult with no data we can
  // act on directly, so the actual column update has to happen from a
  // dedicated listener rather than the shared one above.
  private fun registerRequest(promise: Promise, onGranted: () -> Unit): Int {
    val code = nextRequestCode++
    reactContext.addActivityEventListener(
      object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
          if (requestCode != code) return
          reactContext.removeActivityEventListener(this)
          pending.remove(code)
          if (resultCode == Activity.RESULT_OK) {
            onGranted()
          } else {
            promise.reject("USER_DENIED", "User declined write access")
          }
        }
      },
    )
    return code
  }

  private fun doMove(uri: Uri, albumName: String, promise: Promise) {
    try {
      val values = ContentValues().apply {
        put(MediaStore.MediaColumns.RELATIVE_PATH, "Pictures/$albumName")
      }
      val updated = reactContext.contentResolver.update(uri, values, null, null)
      if (updated > 0) {
        promise.resolve(true)
      } else {
        promise.reject("MOVE_FAILED", "No rows updated")
      }
    } catch (e: Exception) {
      promise.reject("MOVE_FAILED", e)
    }
  }

  private fun deleteDirectly(uri: Uri, promise: Promise) {
    try {
      val deleted = reactContext.contentResolver.delete(uri, null, null)
      if (deleted > 0) {
        promise.resolve(true)
      } else {
        promise.reject("TRASH_FAILED", "No rows deleted")
      }
    } catch (e: SecurityException) {
      val activity = currentActivityOrReject(promise) ?: return
      val recoverable = (e as? android.app.RecoverableSecurityException)?.userAction
      if (recoverable != null) {
        launch(activity, recoverable.actionIntent.intentSender, promise)
      } else {
        promise.reject("TRASH_FAILED", e)
      }
    }
  }

  private fun launch(activity: Activity, sender: IntentSender, promise: Promise) {
    val code = nextRequestCode++
    pending[code] = promise
    activity.startIntentSenderForResult(sender, code, null, 0, 0, 0)
  }

  private fun currentActivityOrReject(promise: Promise): Activity? {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No current activity")
    }
    return activity
  }
}
