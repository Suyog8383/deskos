import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gallerySwipeSort.albumName';

export function useAlbumName() {
  const [albumName, setAlbumNameState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      setAlbumNameState(value);
      setLoading(false);
    });
  }, []);

  const setAlbumName = useCallback((name: string) => {
    setAlbumNameState(name);
    AsyncStorage.setItem(STORAGE_KEY, name);
  }, []);

  return { albumName, setAlbumName, loading };
}
