/**
 * Gallery Swipe Sort
 * @format
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import { requestGalleryPermission } from './src/gallery/permissions';
import { usePhotoStack } from './src/gallery/usePhotoStack';
import { useAlbumName } from './src/gallery/useAlbumName';
import { SwipeDeck } from './src/gallery/SwipeDeck';
import { AlbumSetup } from './src/gallery/AlbumSetup';
import { MediaStoreOps } from './src/native/MediaStoreOps';

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

  if (loading && photos.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e7e7ef" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SwipeDeck photos={photos} onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight} />
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
});

export default App;
