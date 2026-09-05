package com.visioncamerahandlandmarker

import android.util.Log
import com.google.mediapipe.framework.image.ByteBufferImageBuilder
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.ImageProcessingOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker as MPHandLandmarker
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.NullType
import com.margelo.nitro.visioncamerahandlandmarker.HybridVisionCameraHandLandmarkerSpec
import com.margelo.nitro.visioncamerahandlandmarker.Variant_NullType_String
import com.margelo.nitro.visioncamerahandlandmarker.VisionCameraHandLandmarkerResult
import kotlin.math.hypot

/**
 * On-device hand-landmark detection + static-gesture classification, backed
 * by MediaPipe Tasks Vision's `HandLandmarker` running in `RunningMode.IMAGE`
 * (one synchronous, blocking detection call per invocation). That running
 * mode is what lets this be driven directly, per-frame, from a VisionCamera
 * `useFrameOutput` worklet without any async callback plumbing across the
 * JSI boundary.
 *
 * Every MediaPipe class/method name and the `com.google.mediapipe:tasks-vision`
 * / `tasks-core` artifact coordinates used here were verified by downloading
 * the real AARs from Google's Maven repo and inspecting their class files
 * during development — NOT compiled or run on an actual Android toolchain
 * or device (none was available in the authoring session). Build and
 * verify on a real iQOO device before the demo.
 */
class HybridVisionCameraHandLandmarker : HybridVisionCameraHandLandmarkerSpec() {

  companion object {
    private const val TAG = "HandLandmarker"

    // Place the model file at android/src/main/assets/hand_landmarker.task.
    // Download it from:
    // https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task
    private const val MODEL_ASSET_PATH = "hand_landmarker.task"

    // Tuning knobs for the rule-based static-gesture classifier below.
    // These are reasonable starting points, not empirically validated
    // against the real iQOO front camera — retune during on-device testing.
    private const val EXTENDED_MARGIN = 1.1f
    private const val PINCH_DISTANCE_THRESHOLD = 0.06f

    // Standard MediaPipe hand-landmark indices (21-point model).
    private const val WRIST = 0
    private const val THUMB_IP = 3
    private const val THUMB_TIP = 4
    private const val INDEX_MCP = 5
    private const val INDEX_PIP = 6
    private const val INDEX_TIP = 8
    private const val MIDDLE_PIP = 10
    private const val MIDDLE_TIP = 12
    private const val RING_PIP = 14
    private const val RING_TIP = 16
    private const val PINKY_PIP = 18
    private const val PINKY_TIP = 20
  }

  // Lazily created on first detect() call (needs a ReactApplicationContext
  // to load the model asset from), then reused across frames.
  private var landmarker: MPHandLandmarker? = null
  private var initFailed = false

  /**
   * Builds the HandLandmarker, preferring the Snapdragon NPU delegate,
   * falling back to GPU, then to no explicit delegate (MediaPipe's default)
   * if that also fails to initialize. `Delegate` only has GPU/NPU members —
   * there's no explicit "CPU" delegate constant, so the no-acceleration
   * fallback is simply a `BaseOptions` with no delegate set at all.
   */
  private fun getOrCreateLandmarker(): MPHandLandmarker? {
    landmarker?.let { return it }
    if (initFailed) return null

    val context = NitroModules.applicationContext
    if (context == null) {
      Log.e(TAG, "No ReactApplicationContext available yet — dropping frame")
      return null
    }

    fun buildWith(delegate: Delegate?): MPHandLandmarker {
      val baseOptionsBuilder = BaseOptions.builder().setModelAssetPath(MODEL_ASSET_PATH)
      if (delegate != null) baseOptionsBuilder.setDelegate(delegate)

      val options = MPHandLandmarker.HandLandmarkerOptions.builder()
        .setBaseOptions(baseOptionsBuilder.build())
        .setRunningMode(RunningMode.IMAGE)
        .setNumHands(1)
        .setMinHandDetectionConfidence(0.5f)
        .setMinHandPresenceConfidence(0.5f)
        .setMinTrackingConfidence(0.5f)
        .build()

      return MPHandLandmarker.createFromOptions(context, options)
    }

    for ((label, delegate) in listOf("NPU" to Delegate.NPU, "GPU" to Delegate.GPU, "default" to null)) {
      try {
        val created = buildWith(delegate)
        Log.i(TAG, "HandLandmarker initialized with delegate=$label")
        landmarker = created
        return created
      } catch (error: Throwable) {
        Log.w(TAG, "HandLandmarker init failed with delegate=$label, trying next option", error)
      }
    }

    Log.e(TAG, "Failed to initialize HandLandmarker on NPU, GPU, and default")
    initFailed = true
    return null
  }

  override fun detect(
    buffer: ArrayBuffer,
    width: Double,
    height: Double,
    rotationDegrees: Double,
  ): Array<VisionCameraHandLandmarkerResult> {
    val landmarker = getOrCreateLandmarker()
    if (landmarker == null) {
      Log.w(TAG, "detect(): landmarker unavailable (model missing or init failed)")
      return emptyArray()
    }

    val imageWidth = width.toInt()
    val imageHeight = height.toInt()
    val image = mpImageFromFrame(buffer, imageWidth, imageHeight)
    if (image == null) {
      return emptyArray()
    }

    val processingOptions = ImageProcessingOptions.builder()
      .setRotationDegrees(rotationDegrees.toInt())
      .build()

    val result = try {
      landmarker.detect(image, processingOptions)
    } catch (error: Throwable) {
      Log.e(TAG, "detect() failed", error)
      return emptyArray()
    } finally {
      image.close()
    }

    val handsLandmarks = result.landmarks()
    val handsHandedness = result.handedness()

    if (handsLandmarks.isEmpty()) {
      Log.d(TAG, "detect(): no hand in ${width.toInt()}x${height.toInt()} frame")
      return emptyArray()
    }

    return handsLandmarks.indices.map { i ->
      val points = handsLandmarks[i]
      val handedness = handsHandedness.getOrNull(i)?.firstOrNull()?.categoryName() ?: "Unknown"
      val (gesture, confidence) = classifyGesture(points)
      Log.i(TAG, "detect(): $handedness ${gesture ?: "none"} conf=$confidence")
      val wrist = points[WRIST]

      VisionCameraHandLandmarkerResult(
        gesture = if (gesture != null) {
          Variant_NullType_String.create(gesture)
        } else {
          Variant_NullType_String.create(NullType.NULL)
        },
        confidence = confidence.toDouble(),
        handedness = handedness,
        palmX = wrist.x().toDouble(),
        palmY = wrist.y().toDouble(),
      )
    }.toTypedArray()
  }

  /**
   * VisionCamera `pixelFormat: 'rgb'` is NOT packed RGB888. The docs map it
   * to `rgb-bgra-8-bit` / `rgb-rgba-8-bit` (4 bytes/pixel). Passing that
   * buffer as `IMAGE_FORMAT_RGB` makes MediaPipe throw
   * "buffer should be: width*height*3 but is width*height*4" — which is
   * why the UI stayed on NO HAND even with a palm in the preview.
   */
  private fun mpImageFromFrame(buffer: ArrayBuffer, width: Int, height: Int): MPImage? {
    val src = buffer.getBuffer(true)
    src.rewind()
    val remaining = src.remaining()
    val rgbSize = width * height * 3
    val rgbaSize = width * height * 4

    val format = when (remaining) {
      rgbSize -> MPImage.IMAGE_FORMAT_RGB
      rgbaSize -> MPImage.IMAGE_FORMAT_RGBA
      else -> {
        Log.e(
          TAG,
          "Unexpected buffer size $remaining for ${width}x${height} (rgb=$rgbSize rgba=$rgbaSize)",
        )
        return null
      }
    }

    return ByteBufferImageBuilder(src, width, height, format).build()
  }

  /**
   * Simple, transparent rule-based classifier over the 21 MediaPipe hand
   * landmarks (see index constants above). Deliberately not a learned
   * model — keeps this fast, dependency-free, and easy to retune live
   * during the demo by adjusting `EXTENDED_MARGIN` / `PINCH_DISTANCE_THRESHOLD`.
   *
   * `confidence` here is a fixed heuristic value per gesture, not a
   * statistically derived score.
   */
  private fun classifyGesture(points: List<NormalizedLandmark>): Pair<String?, Float> {
    val wrist = points[WRIST]

    fun dist(a: NormalizedLandmark, b: NormalizedLandmark): Float {
      return hypot((a.x() - b.x()).toDouble(), (a.y() - b.y()).toDouble()).toFloat()
    }

    fun fingerExtended(tipIdx: Int, pipIdx: Int): Boolean {
      return dist(points[tipIdx], wrist) > dist(points[pipIdx], wrist) * EXTENDED_MARGIN
    }

    val thumbTip = points[THUMB_TIP]
    val thumbIp = points[THUMB_IP]
    val indexMcp = points[INDEX_MCP]
    val indexTip = points[INDEX_TIP]

    // The thumb extends sideways rather than upward, so it needs its own
    // heuristic: "extended" means it's spread away from the palm (farther
    // from the index knuckle than the thumb's own middle joint is).
    val thumbExtended = dist(thumbTip, indexMcp) > dist(thumbIp, indexMcp)
    val indexExtended = fingerExtended(INDEX_TIP, INDEX_PIP)
    val middleExtended = fingerExtended(MIDDLE_TIP, MIDDLE_PIP)
    val ringExtended = fingerExtended(RING_TIP, RING_PIP)
    val pinkyExtended = fingerExtended(PINKY_TIP, PINKY_PIP)

    val extendedCount =
      listOf(thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended).count { it }

    return when {
      extendedCount == 5 -> "OPEN_PALM" to 0.9f
      extendedCount == 0 -> "FIST" to 0.9f
      thumbExtended && indexExtended && !middleExtended && !ringExtended && !pinkyExtended &&
        dist(thumbTip, indexTip) < PINCH_DISTANCE_THRESHOLD -> "PINCH" to 0.75f
      thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended ->
        // Normalized image y grows downward, so a smaller y is "higher" on screen.
        if (thumbTip.y() < wrist.y()) "THUMBS_UP" to 0.8f else "THUMBS_DOWN" to 0.8f
      indexExtended && !thumbExtended && !middleExtended && !ringExtended && !pinkyExtended ->
        if (indexTip.y() < indexMcp.y()) "POINT_UP" to 0.8f else "POINT_DOWN" to 0.8f
      else -> null to 0f
    }
  }
}
