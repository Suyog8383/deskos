import { useCallback, useRef, useState } from 'react'
import type { CameraFrameOutput, CameraOrientation } from 'react-native-vision-camera'
import { useFrameOutput } from 'react-native-vision-camera'
import { runOnJS } from 'react-native-worklets'
import { HandLandmarker } from 'react-native-vision-camera-hand-landmarker'
import type { GestureLabel, HandGestureState } from './types'

// Swipe tuning: a swipe is "palm moved more than SWIPE_MIN_DISTANCE (as a
// fraction of frame width) within SWIPE_MAX_DURATION_MS, and we're not
// still inside the cooldown from the last one". Not validated on-device —
// retune against the real front camera.
const SWIPE_MIN_DISTANCE = 0.18
const SWIPE_MAX_DURATION_MS = 500
const SWIPE_COOLDOWN_MS = 700

const NO_HAND_STATE: HandGestureState = { gesture: null, confidence: 0, handedness: null }

function orientationToRotationDegrees(orientation: CameraOrientation): number {
  'worklet'
  switch (orientation) {
    case 'up':
      return 0
    case 'right':
      return 90
    case 'down':
      return 180
    case 'left':
      return 270
  }
}

/**
 * Drives the native on-device HandLandmarker off the front camera's frame
 * stream, and layers simple JS-side temporal swipe detection on top of the
 * per-frame palm position it reports.
 *
 * @note Assumes a Nitro HybridObject created at JS-thread module scope
 * (`HandLandmarker`, from the local `react-native-vision-camera-hand-landmarker`
 * module) can safely be called from inside a `useFrameOutput` worklet
 * running on a different thread/runtime. That's the intended integration
 * between `react-native-nitro-modules` and `react-native-worklets` for
 * exactly this use case, but it has not been verified on a real device in
 * this session (no Android toolchain available) — if it turns out not to
 * hold, the fix is to construct the HybridObject lazily from inside the
 * worklet instead of importing the shared instance.
 */
export function useHandGesture(): {
  frameOutput: CameraFrameOutput
  state: HandGestureState
} {
  const [state, setState] = useState<HandGestureState>(NO_HAND_STATE)

  // Palm-position history for swipe detection. A ref, not state — only
  // ever touched from `onDetection` below (always on the JS thread), so it
  // doesn't need to be a worklet shared value, and reading/writing it
  // doesn't trigger re-renders on its own.
  const lastPalmRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastSwipeAtRef = useRef(0)

  const onDetection = useCallback(
    (gesture: string | null, confidence: number, handedness: string, palmX: number, palmY: number) => {
      const now = Date.now()
      const last = lastPalmRef.current
      lastPalmRef.current = { x: palmX, y: palmY, t: now }

      // A confident static gesture from the native classifier always wins.
      if (gesture != null) {
        setState({ gesture: gesture as GestureLabel, confidence, handedness })
        return
      }

      // No static gesture this frame — this is the "hand mid-motion" state
      // a swipe passes through, so check palm displacement over time.
      if (
        last != null &&
        now - lastSwipeAtRef.current > SWIPE_COOLDOWN_MS &&
        now - last.t < SWIPE_MAX_DURATION_MS
      ) {
        const dx = palmX - last.x
        if (Math.abs(dx) > SWIPE_MIN_DISTANCE) {
          lastSwipeAtRef.current = now
          setState({ gesture: dx > 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT', confidence: 0.6, handedness })
          return
        }
      }

      setState(NO_HAND_STATE)
    },
    [],
  )

  const onNoHand = useCallback(() => {
    lastPalmRef.current = null
    setState(NO_HAND_STATE)
  }, [])

  const frameOutput = useFrameOutput({
    pixelFormat: 'rgb',
    onFrame(frame) {
      'worklet'
      if (!frame.hasPixelBuffer) {
        frame.dispose()
        return
      }

      const buffer = frame.getPixelBuffer()
      const rotationDegrees = orientationToRotationDegrees(frame.orientation)
      const results = HandLandmarker.detect(buffer, frame.width, frame.height, rotationDegrees)
      const first = results[0]

      if (first != null) {
        runOnJS(onDetection)(first.gesture, first.confidence, first.handedness, first.palmX, first.palmY)
      } else {
        runOnJS(onNoHand)()
      }

      frame.dispose()
    },
  })

  return { frameOutput, state }
}
