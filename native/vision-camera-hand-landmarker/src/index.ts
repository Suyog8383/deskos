import { NitroModules } from 'react-native-nitro-modules'
import type {
  VisionCameraHandLandmarker as VisionCameraHandLandmarkerSpec,
  VisionCameraHandLandmarkerResult,
} from './specs/vision-camera-hand-landmarker.nitro'

export type { VisionCameraHandLandmarkerResult }

/**
 * On-device (GPU/NPU-delegate accelerated) hand-landmark + static-gesture
 * detector, backed by MediaPipe Tasks Vision on Android.
 *
 * @example
 * ```ts
 * const results = HandLandmarker.detect(buffer, width, height, rotation)
 * ```
 */
export const HandLandmarker =
  NitroModules.createHybridObject<VisionCameraHandLandmarkerSpec>(
    'VisionCameraHandLandmarker',
  )
