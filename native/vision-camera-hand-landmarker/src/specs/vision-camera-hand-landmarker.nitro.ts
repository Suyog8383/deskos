import type { HybridObject } from 'react-native-nitro-modules'

/**
 * One detected hand's classified static gesture for a single camera frame.
 *
 * Landmark points themselves are intentionally not exposed across the JSI
 * boundary — classification happens natively (on the Snapdragon GPU/NPU
 * delegate) and only this small, cheap-to-marshal struct crosses over.
 * `palmX`/`palmY` (normalized 0-1 frame coordinates) are exposed so JS can
 * do simple temporal tracking (e.g. swipe-left/right) across frames without
 * needing the full 21-point landmark set.
 */
export interface VisionCameraHandLandmarkerResult {
  /**
   * The classified static gesture label (e.g. "OPEN_PALM", "FIST",
   * "THUMBS_UP", "THUMBS_DOWN", "POINT_UP", "POINT_DOWN", "PINCH"), or
   * `null` if a hand was detected but no gesture matched confidently.
   */
  gesture: string | null
  /** Classifier confidence for `gesture`, in the range [0, 1]. */
  confidence: number
  /** `"Left"` or `"Right"`, as reported by MediaPipe's handedness model. */
  handedness: string
  /** Normalized [0, 1] horizontal position of the palm center. */
  palmX: number
  /** Normalized [0, 1] vertical position of the palm center. */
  palmY: number
}

export interface VisionCameraHandLandmarker
  extends HybridObject<{ android: 'kotlin' }> {
  /**
   * Runs one synchronous hand-landmark detection + static-gesture
   * classification pass over a single camera frame.
   *
   * Intended to be called from a VisionCamera `useFrameOutput` worklet, once
   * per frame, with the frame's raw RGB pixel buffer.
   *
   * @param buffer Raw RGB888 pixel data (see `pixelFormat: 'rgb'` on
   * `useFrameOutput`).
   * @param width Frame width in pixels.
   * @param height Frame height in pixels.
   * @param rotationDegrees Clockwise rotation (0/90/180/270) needed to
   * present the buffer upright, as reported by VisionCamera.
   * @returns One result per detected hand (usually 0 or 1 for this app's
   * single-hand gesture-control use case).
   */
  detect(
    buffer: ArrayBuffer,
    width: number,
    height: number,
    rotationDegrees: number,
  ): VisionCameraHandLandmarkerResult[]
}
