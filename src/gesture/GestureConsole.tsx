import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera'
import { useHandGesture } from './useHandGesture'

const GESTURE_LABELS: Record<string, string> = {
  OPEN_PALM: 'Open palm',
  FIST: 'Fist',
  THUMBS_UP: 'Thumbs up',
  THUMBS_DOWN: 'Thumbs down',
  POINT_UP: 'Point up',
  POINT_DOWN: 'Point down',
  PINCH: 'Pinch',
  SWIPE_LEFT: 'Swipe left',
  SWIPE_RIGHT: 'Swipe right',
}

/**
 * Front-camera gesture console — DeskOS's "Zero-Touch Spatial Control"
 * pillar. Runs the native HandLandmarker per-frame (see `useHandGesture`)
 * and shows the live classified gesture, ready to be wired to the laptop
 * bridge (see `bridge/PROTOCOL.md` for the `{ type: 'gesture', command }`
 * message it expects).
 */
export function GestureConsole() {
  const device = useCameraDevice('front')
  const { hasPermission, requestPermission } = useCameraPermission()
  const { frameOutput, state } = useHandGesture()

  React.useEffect(() => {
    if (!hasPermission) requestPermission()
  }, [hasPermission, requestPermission])

  const canRenderCamera = hasPermission && device != null

  return (
    <View style={styles.container}>
      <View style={styles.previewPane}>
        {canRenderCamera ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive
            outputs={[frameOutput]}
          />
        ) : (
          <View style={styles.previewFallback}>
            <Text style={styles.fallbackTitle}>CAMERA OFFLINE</Text>
            <Text style={styles.fallbackText}>
              {!hasPermission ? 'Camera permission is required.' : 'Searching for a front camera...'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.consolePane}>
        <Text style={styles.eyebrow}>DESKOS / GESTURE</Text>
        <Text style={styles.gestureLabel}>
          {state.gesture ? GESTURE_LABELS[state.gesture] ?? state.gesture : 'No gesture'}
        </Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailText}>
            {state.handedness ? `${state.handedness} hand` : 'No hand detected'}
          </Text>
          <Text style={styles.detailText}>
            {state.gesture ? `${Math.round(state.confidence * 100)}% confidence` : ''}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071018',
  },
  previewPane: {
    flex: 1.2,
    minHeight: 320,
    overflow: 'hidden',
    backgroundColor: '#101d26',
  },
  previewFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackTitle: {
    color: '#e7f3f1',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  fallbackText: {
    color: '#8ba5a8',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  consolePane: {
    backgroundColor: '#071018',
    padding: 20,
  },
  eyebrow: {
    color: '#ed6a5a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  gestureLabel: {
    color: '#e7f3f1',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  detailText: {
    color: '#8ba5a8',
    fontSize: 12,
    fontWeight: '600',
  },
})
