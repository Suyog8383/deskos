import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

type Props = {
  onSelect: (albumName: string) => void;
};

export function AlbumSetup({ onSelect }: Props) {
  const [existingAlbums, setExistingAlbums] = useState<string[]>([]);
  const [newAlbumName, setNewAlbumName] = useState('');

  useEffect(() => {
    CameraRoll.getAlbums({ assetType: 'Photos' })
      .then(albums => setExistingAlbums(albums.map(a => a.title)))
      .catch(() => setExistingAlbums([]));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pick a "keep" album</Text>
      <Text style={styles.subtitle}>Right-swiped photos move here. Set once, reused every time.</Text>

      {existingAlbums.length > 0 && (
        <FlatList
          data={existingAlbums}
          keyExtractor={item => item}
          style={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.albumRow} onPress={() => onSelect(item)}>
              <Text style={styles.albumRowText}>{item}</Text>
            </Pressable>
          )}
        />
      )}

      <View style={styles.newAlbumRow}>
        <TextInput
          style={styles.input}
          placeholder="Or type a new album name"
          placeholderTextColor="#5f5f6e"
          value={newAlbumName}
          onChangeText={setNewAlbumName}
        />
        <Pressable
          style={[styles.createButton, !newAlbumName.trim() && styles.createButtonDisabled]}
          disabled={!newAlbumName.trim()}
          onPress={() => onSelect(newAlbumName.trim())}>
          <Text style={styles.createButtonText}>USE</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    color: '#e7e7ef',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#8b8b9a',
    fontSize: 13,
    marginBottom: 20,
  },
  list: {
    maxHeight: 260,
    marginBottom: 20,
  },
  albumRow: {
    backgroundColor: '#1a1a22',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
  },
  albumRowText: {
    color: '#e7e7ef',
    fontSize: 14,
  },
  newAlbumRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    backgroundColor: '#1a1a22',
    borderRadius: 8,
    color: '#e7e7ef',
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: '#7bd88f',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  createButtonDisabled: {
    backgroundColor: '#34434a',
  },
  createButtonText: {
    color: '#071018',
    fontSize: 12,
    fontWeight: '800',
  },
});
