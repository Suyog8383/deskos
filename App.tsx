/**
 * Gallery Swipe Sort
 * @format
 */

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Camera } from 'react-native-vision-camera';
import { PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import { requestGalleryPermission } from './src/gallery/permissions';
import { usePhotoStack } from './src/gallery/usePhotoStack';
import { useAlbumName } from './src/gallery/useAlbumName';
import { SwipeDeck } from './src/gallery/SwipeDeck';
import { AlbumSetup } from './src/gallery/AlbumSetup';
import { MediaStoreOps } from './src/native/MediaStoreOps';
import { useHandSwipe } from './src/gesture/useHandSwipe';

function App() {
  const [permissionState, setPermissionState] = useState<'checking' | 'granted' | 'denied'>(
    'checking',
  );
  const { albumName, setAlbumName, loading: albumLoading } = useAlbumName();

  useEffect(() => {
    requestGalleryPermission().then(granted => {
      setPermissionState(granted ? 'granted' : 'denied');
    });
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {permissionState === 'checking' && (
          <View style={styles.center}>
            <ActivityIndicator color="#e7e7ef" />
          </View>
        )}
        {permissionState === 'denied' && (
          <View style={styles.center}>
            <Text style={styles.message}>Gallery permission is required to sort photos.</Text>
          </View>
        )}
        {permissionState === 'granted' && albumLoading && (
          <View style={styles.center}>
            <ActivityIndicator color="#e7e7ef" />
          </View>
        )}
        {permissionState === 'granted' && !albumLoading && !albumName && (
          <AlbumSetup onSelect={setAlbumName} />
        )}
        {permissionState === 'granted' && !albumLoading && albumName && (
          <GalleryStack albumName={albumName} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function GalleryStack({ albumName }: { albumName: string }) {
  const { photos, loading, consumeTop } = usePhotoStack();
  const [statusText, setStatusText] = useState('');
  // Imperative handle so the gesture layer can trigger the exact same
  // animated swipe (and therefore the exact same trash/move handlers) as a
  // touch swipe, instead of duplicating the swipe-completion logic.
  const triggerRef = useRef<((direction: 'left' | 'right') => void) | null>(null);

  const handleSwipeLeft = (photo: PhotoIdentifier) => {
    const uri = photo.node.image.uri;
    consumeTop();
    MediaStoreOps.trashPhoto(uri)
      .then(() => setStatusText('Moved to Trash'))
      .catch(err => {
        console.error('[gallery-swipe-sort] trash failed', err);
        setStatusText(`Trash failed: ${err?.message ?? err}`);
      });
  };

  const handleSwipeRight = (photo: PhotoIdentifier) => {
    const uri = photo.node.image.uri;
    consumeTop();
    MediaStoreOps.moveToAlbum(uri, albumName)
      .then(() => setStatusText(`Moved to ${albumName}`))
      .catch(err => {
        console.error('[gallery-swipe-sort] move failed', err);
        setStatusText(`Move failed: ${err?.message ?? err}`);
      });
  };

  const { device, hasPermission, requestPermission, handDetected, frameOutput } = useHandSwipe(
    () => triggerRef.current?.('left'),
    () => triggerRef.current?.('right'),
  );

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  if (loading && photos.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e7e7ef" />
      </View>
    );
  }

  const gestureActive = hasPermission && device != null;

  return (
    <View style={styles.container}>
      <SwipeDeck
        photos={photos}
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        triggerRef={triggerRef}
      />

      {gestureActive && (
        <View style={styles.gesturePreview}>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive
            outputs={[frameOutput]}
          />
        </View>
      )}

      <View style={styles.gestureBadge}>
        <View style={[styles.gestureDot, handDetected ? styles.gestureDotActive : null]} />
        <Text style={styles.gestureBadgeText}>
          {!gestureActive ? 'GESTURE OFF' : handDetected ? 'HAND DETECTED' : 'NO HAND'}
        </Text>
      </View>

      {statusText ? (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    color: '#e7e7ef',
    fontSize: 15,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  statusBar: {
    alignItems: 'center',
    bottom: 24,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  statusText: {
    backgroundColor: 'rgba(26, 26, 34, 0.9)',
    borderRadius: 8,
    color: '#e7e7ef',
    fontSize: 12,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  gesturePreview: {
    borderColor: 'rgba(231, 231, 239, 0.25)',
    borderRadius: 10,
    borderWidth: 1,
    bottom: 24,
    height: 96,
    overflow: 'hidden',
    position: 'absolute',
    right: 16,
    width: 72,
  },
  gestureBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 34, 0.9)',
    borderRadius: 8,
    flexDirection: 'row',
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: 'absolute',
    top: 16,
  },
  gestureDot: {
    backgroundColor: '#5f5f6e',
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    width: 8,
  },
  gestureDotActive: {
    backgroundColor: '#7bd88f',
  },
  gestureBadgeText: {
    color: '#e7e7ef',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});

export default App;
