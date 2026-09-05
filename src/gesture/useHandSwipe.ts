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
  const lastSwipeAtRef = useRef(0);
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeLeftRef.current = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;

  const handlePalmX = useCallback((palmX: number | null) => {
    if (palmX == null) {
      setHandDetected(false);
      samplesRef.current = [];
      return;
    }
    setHandDetected(true);

    const now = Date.now();
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
