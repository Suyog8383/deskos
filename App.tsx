/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {
  Camera,
  usePhotoOutput,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import React, { useEffect, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { GestureConsole } from './src/gesture/GestureConsole';
import { FileSortConsole } from './src/files/FileSortConsole';

type Tab = 'ocr' | 'gesture' | 'sort';

function App() {
  const [tab, setTab] = useState<Tab>('ocr');

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <View style={tabStyles.tabBar}>
        <TabButton label="OCR CAPTURE" active={tab === 'ocr'} onPress={() => setTab('ocr')} />
        <TabButton label="GESTURE CONTROL" active={tab === 'gesture'} onPress={() => setTab('gesture')} />
        <TabButton label="SORT FILES" active={tab === 'sort'} onPress={() => setTab('sort')} />
      </View>
      {tab === 'ocr' && <CameraConsole />}
      {tab === 'gesture' && <GestureConsole />}
      {tab === 'sort' && <FileSortConsole />}
    </SafeAreaProvider>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[tabStyles.tab, active && tabStyles.tabActive]}>
      <Text style={[tabStyles.tabText, active && tabStyles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#071018',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  tab: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    marginRight: 24,
    paddingBottom: 12,
  },
  tabActive: {
    borderBottomColor: '#ed6a5a',
  },
  tabText: {
    color: '#8ba5a8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: '#e7f3f1',
  },
});

function CameraConsole() {
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput();
  const {
    hasPermission: hasCameraPermission,
    requestPermission: requestCameraPermission,
  } = useCameraPermission();
  const {
    hasPermission: hasMicrophonePermission,
    requestPermission: requestMicrophonePermission,
  } = useMicrophonePermission();
  const [lastCapture, setLastCapture] = useState('No frame captured');

  useEffect(() => {
    if (!hasCameraPermission) {
      requestCameraPermission();
    }
    if (!hasMicrophonePermission) {
      requestMicrophonePermission();
    }
  }, [
    hasCameraPermission,
    hasMicrophonePermission,
    requestCameraPermission,
    requestMicrophonePermission,
  ]);

  const captureSnapshot = async () => {
    setLastCapture('Capturing...');
    try {
      const photo = await photoOutput.capturePhotoToFile({ flashMode: 'off' }, {});
      setLastCapture(`Snapshot ready: ${photo.filePath}`);
    } catch (error) {
      // Surface the real failure instead of failing silently — this was
      // previously an unhandled promise rejection with zero user feedback.
      const message = error instanceof Error ? error.message : String(error);
      setLastCapture(`Capture failed: ${message}`);
      console.error('captureSnapshot failed', error);
    }
  };

  const canRenderCamera = hasCameraPermission && device != null;

  return (
    <View style={styles.container}>
      <View style={styles.previewPane}>
        {canRenderCamera ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive
            outputs={[photoOutput]}
          />
        ) : (
          <View style={styles.previewFallback}>
            <Text style={styles.fallbackTitle}>CAMERA OFFLINE</Text>
            <Text style={styles.fallbackText}>
              {!hasCameraPermission
                ? 'Camera permission is required.'
                : 'Searching for a camera device...'}
            </Text>
          </View>
        )}
        <View style={styles.previewLabel}>
          <View style={styles.liveDot} />
          <Text style={styles.previewLabelText}>LIVE CAPTURE</Text>
        </View>
      </View>

      <View style={styles.consolePane}>
        <View style={styles.consoleHeader}>
          <View>
            <Text style={styles.eyebrow}>DESKOS / VISION</Text>
            <Text style={styles.title}>Capture console</Text>
          </View>
          <Text style={styles.deviceLabel}>
            {device?.localizedName ?? 'NO DEVICE'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <StatusItem label="CAMERA" ready={hasCameraPermission} />
          <StatusItem label="MICROPHONE" ready={hasMicrophonePermission} />
          <StatusItem label="SNAPSHOT" ready={canRenderCamera} />
        </View>

        <View style={styles.logBox}>
          <Text style={styles.logPrompt}>$ capture.status</Text>
          <Text style={styles.logText}>{lastCapture}</Text>
          <Text style={styles.logText}>Frame processor: ready for AI pipeline</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!canRenderCamera}
          onPress={captureSnapshot}
          style={({ pressed }) => [
            styles.captureButton,
            !canRenderCamera && styles.captureButtonDisabled,
            pressed && styles.captureButtonPressed,
          ]}>
          <Text style={styles.captureButtonText}>CAPTURE FRAME</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatusItem({ label, ready }: { label: string; ready: boolean }) {
  return (
    <View style={styles.statusItem}>
      <View style={[styles.statusDot, ready ? styles.statusReady : styles.statusWaiting]} />
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
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
  previewLabel: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 16, 24, 0.72)',
    flexDirection: 'row',
    left: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'absolute',
    top: 18,
  },
  liveDot: {
    backgroundColor: '#ed6a5a',
    borderRadius: 4,
    height: 8,
    marginRight: 8,
    width: 8,
  },
  previewLabelText: {
    color: '#e7f3f1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  consolePane: {
    backgroundColor: '#071018',
    padding: 20,
  },
  consoleHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#ed6a5a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    color: '#e7f3f1',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 5,
  },
  deviceLabel: {
    color: '#8ba5a8',
    fontSize: 11,
    maxWidth: 130,
    textAlign: 'right',
  },
  statusRow: {
    borderBottomColor: '#20313a',
    borderBottomWidth: 1,
    borderTopColor: '#20313a',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingVertical: 13,
  },
  statusItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    width: 8,
  },
  statusReady: {
    backgroundColor: '#7bd88f',
  },
  statusWaiting: {
    backgroundColor: '#edb95f',
  },
  statusLabel: {
    color: '#8ba5a8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  logBox: {
    backgroundColor: '#0d1a22',
    marginTop: 16,
    padding: 13,
  },
  logPrompt: {
    color: '#7bd88f',
    fontSize: 12,
    marginBottom: 7,
  },
  logText: {
    color: '#9db2b3',
    fontSize: 12,
    lineHeight: 20,
  },
  captureButton: {
    alignItems: 'center',
    backgroundColor: '#ed6a5a',
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 48,
  },
  captureButtonDisabled: {
    backgroundColor: '#34434a',
  },
  captureButtonPressed: {
    opacity: 0.8,
  },
  captureButtonText: {
    color: '#071018',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});

export default App;
