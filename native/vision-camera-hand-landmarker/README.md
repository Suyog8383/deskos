# react-native-vision-camera-hand-landmarker

DeskOS's local Nitro module: on-device hand-landmark detection + static-
gesture classification, backed by [MediaPipe Tasks Vision][tasks-vision]
`HandLandmarker` on Android. Not published to npm — consumed in-repo via a
`file:` dependency from the app's `package.json`.

Android only. iOS has no implementation (see `nitro.json`'s `autolinking` —
it only declares an `android` entry) — out of scope for this hackathon's
target hardware (iQOO phone).

[tasks-vision]: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker

## ⚠️ Not yet verified on-device

Every MediaPipe class/method name and Gradle dependency version used in
`android/src/main/java/.../HybridVisionCameraHandLandmarker.kt` was checked
against the real `com.google.mediapipe:tasks-vision`/`tasks-core` 1.0.0 AARs
(downloaded from Google's Maven repo and inspected directly), and the Nitro
glue was generated for real via `nitrogen` (not hand-written). But the
Kotlin implementation itself has **not been compiled or run on an Android
toolchain or a real device** — do that, and fix whatever surfaces, before
the demo.

## Setup (do this before it will build)

1. **Get the model file.** Download `hand_landmarker.task` and place it at
   `android/src/main/assets/hand_landmarker.task`:
   ```sh
   mkdir -p android/src/main/assets
   curl -L -o android/src/main/assets/hand_landmarker.task \
     https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task
   ```
2. **Gradle sync** the app (`android/`) after `npm install` at the repo
   root — standard React Native autolinking picks this module up because
   it's a normal local package with an `android/build.gradle`.
3. **Run on a real device.** The Android emulator has no camera worth
   testing gestures with, and MediaPipe's GPU/NPU delegates behave
   differently (or not at all) on emulated hardware.

## What `detect()` does

One call = one synchronous MediaPipe `HandLandmarker.detect()` pass
(`RunningMode.IMAGE`) over a single frame, plus a small rule-based
classifier over the resulting 21 hand landmarks. See the KDoc in
`HybridVisionCameraHandLandmarker.kt` for the exact heuristic and its two
tuning constants (`EXTENDED_MARGIN`, `PINCH_DISTANCE_THRESHOLD`) — expect to
retune those against the real front camera.

Recognized gestures: `OPEN_PALM`, `FIST`, `THUMBS_UP`, `THUMBS_DOWN`,
`POINT_UP`, `POINT_DOWN`, `PINCH`. (`SWIPE_LEFT`/`SWIPE_RIGHT` are *not*
produced here — those are temporal gestures, detected in JS by tracking
`palmX`/`palmY` across frames; see `src/gesture/useHandGesture.ts` in the
app.)

## Delegate (acceleration) selection

`Delegate` in `tasks-core` only has two members: `GPU` and `NPU` — there is
no explicit "CPU" constant. `getOrCreateLandmarker()` tries `NPU` first
(the literal Snapdragon NPU delegate — this is the real accelerator the
hackathon's "Creative Phone Use" scoring cares about), falls back to `GPU`,
then falls back to no delegate set at all (MediaPipe's own default) if both
fail to initialize. Check Logcat for `HandLandmarker initialized with
delegate=...` to see which one actually won on the demo device.

## Known limitations / next steps

- The gesture classifier is hand-rolled geometry, not a trained model —
  expect to tune thresholds, and possibly add a couple more gesture rules,
  once you're looking at real landmark data from the iQOO front camera.
- `RunningMode.IMAGE` (synchronous, one-shot) was chosen deliberately so
  `detect()` can be called directly from a `useFrameOutput` worklet.
  `RunningMode.LIVE_STREAM` would give MediaPipe better internal tracking
  but needs an async callback — restructuring to that is a reasonable
  follow-up once the synchronous version is working end-to-end.
- No `minHandDetectionConfidence`/etc. tuning has been validated on-device.
