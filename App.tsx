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
import { SwipeDeck } from './src/gallery/SwipeDeck';

function App() {
  const [permissionState, setPermissionState] = useState<'checking' | 'granted' | 'denied'>(
    'checking',
  );

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
        {permissionState === 'granted' && <GalleryStack />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function GalleryStack() {
  const { photos, loading, consumeTop } = usePhotoStack();

  const handleSwipeLeft = (photo: PhotoIdentifier) => {
    // Step 2 wires this to MediaStore.createTrashRequest().
    console.log('[gallery-swipe-sort] TRASH', photo.node.image.uri);
    consumeTop();
  };

  const handleSwipeRight = (photo: PhotoIdentifier) => {
    // Step 2 wires this to the move-to-album flow.
    console.log('[gallery-swipe-sort] KEEP/MOVE', photo.node.image.uri);
    consumeTop();
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
});

export default App;
