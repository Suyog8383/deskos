/**
 * The full set of gestures DeskOS recognizes. Must stay in sync with
 * `GESTURE_TO_ACTION` in `bridge/gestureMap.js` (the laptop-side Executor) —
 * that's the single source of truth for which command names the bridge
 * understands.
 *
 * `SWIPE_LEFT`/`SWIPE_RIGHT` are the two entries the native HandLandmarker
 * never produces itself (see its README) — they're motion gestures,
 * detected here in JS by tracking palm position across frames.
 */
export type GestureLabel =
  | 'OPEN_PALM'
  | 'FIST'
  | 'THUMBS_UP'
  | 'THUMBS_DOWN'
  | 'POINT_UP'
  | 'POINT_DOWN'
  | 'PINCH'
  | 'SWIPE_LEFT'
  | 'SWIPE_RIGHT'

export interface HandGestureState {
  gesture: GestureLabel | null
  /** [0, 1]. Heuristic confidence from the classifier, not a learned score. */
  confidence: number
  handedness: string | null
}
