import { useCallback, useRef, useState } from 'react';
import {
  Frame,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
} from 'react-native-vision-camera';
import { runOnJS } from 'react-native-worklets';
import { HandLandmarker } from 'react-native-vision-camera-hand-landmarker';

// Fraction of normalized (0-1) frame width the palm must travel to count as
// a swipe, measured over the rolling window below.
const SWIPE_DISTANCE_THRESHOLD = 0.18;
// Ignore new swipes for this long after one fires, so a single physical
// swipe motion can't trigger multiple card swipes.
const SWIPE_COOLDOWN_MS = 800;
// How far back to look for palm-position samples when computing direction.
const WINDOW_MS = 350;
// MediaPipe's per-frame IMAGE-mode detection (no motion tracking between
// frames) frequently misses a frame or two of a genuinely fast-moving,
// motion-blurred hand. Without this grace period, that one missed frame
// wipes the whole rolling window before a real swipe can accumulate enough
// distance, while a hand held still for a static gesture (e.g. a pinch) is
// detected every frame and never hits this path — so treat a short gap as
// "still tracking", not "hand gone".
const DETECTION_GRACE_MS = 220;
// Fraction of consecutive sample-to-sample deltas that must agree with the
// overall swipe direction. Filters out the tiny back-and-forth jitter of a
// hand held steady up close to the lens (e.g. mid-pinch), which can
// otherwise cross SWIPE_DISTANCE_THRESHOLD without ever being a deliberate
// one-direction sweep.
const MIN_TREND_AGREEMENT = 0.6;

type Sample = { x: number; t: number };

/**
 * Front-camera hand-swipe detection: per-frame static-gesture classification
 * happens natively on the NPU/GPU delegate (see
 * native/vision-camera-hand-landmarker), this hook just tracks the palm's
 * x-position across a rolling window of recent frames in JS to detect
 * left/right swipe motion.
 */
export function useHandSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [handDetected, setHandDetected] = useState(false);

  const samplesRef = useRef<Sample[]>([]);
  const lastSeenAtRef = useRef(0);
  const lastSwipeAtRef = useRef(0);
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeLeftRef.current = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;

  const handlePalmX = useCallback((palmX: number | null) => {
    const now = Date.now();
    setHandDetected(palmX != null);

    if (palmX == null) {
      if (now - lastSeenAtRef.current > DETECTION_GRACE_MS) {
        samplesRef.current = [];
      }
      return;
    }
    lastSeenAtRef.current = now;

    const samples = samplesRef.current;
    samples.push({ x: palmX, t: now });
    while (samples.length > 0 && now - samples[0].t > WINDOW_MS) {
      samples.shift();
    }

    if (now - lastSwipeAtRef.current < SWIPE_COOLDOWN_MS || samples.length < 2) {
      return;
    }

    const dx = palmX - samples[0].x;
    if (Math.abs(dx) < SWIPE_DISTANCE_THRESHOLD) {
      return;
    }

    const dxSign = Math.sign(dx);
    let agree = 0;
    let total = 0;
    for (let i = 1; i < samples.length; i++) {
      const step = samples[i].x - samples[i - 1].x;
      if (step === 0) continue;
      total++;
      if (Math.sign(step) === dxSign) agree++;
    }
    if (total > 0 && agree / total < MIN_TREND_AGREEMENT) {
      return;
    }

    lastSwipeAtRef.current = now;
    samplesRef.current = [];
    if (dx > 0) {
      onSwipeRightRef.current();
    } else {
      onSwipeLeftRef.current();
    }
  }, []);

  const onFrame = useCallback(
    (frame: Frame) => {
      'worklet';
      let palmX: number | null = null;
      try {
        const rotationDegrees =
          frame.orientation === 'right'
            ? 90
            : frame.orientation === 'down'
              ? 180
              : frame.orientation === 'left'
                ? 270
                : 0;
        const results = HandLandmarker.detect(
          frame.getPixelBuffer(),
          frame.width,
          frame.height,
          rotationDegrees,
        );
        if (results.length > 0) {
          palmX = results[0].palmX;
        }
      } catch {
        // A dropped/unreadable frame shouldn't crash the camera pipeline.
      }
      runOnJS(handlePalmX)(palmX);
      frame.dispose();
    },
    [handlePalmX],
  );

  const frameOutput = useFrameOutput({ pixelFormat: 'rgb', onFrame });

  return { device, hasPermission, requestPermission, handDetected, frameOutput };
}
