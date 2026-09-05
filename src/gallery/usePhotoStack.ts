import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraRoll, PhotoIdentifier } from '@react-native-camera-roll/camera-roll';

const PAGE_SIZE = 30;
// Fetch the next page once the buffer runs down to this many remaining
// photos, so the stack never has to block on a network/disk round trip
// mid-swipe.
const REFILL_THRESHOLD = 10;

export function usePhotoStack() {
  const [photos, setPhotos] = useState<PhotoIdentifier[]>([]);
  const [loading, setLoading] = useState(true);
  const cursorRef = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);
  const fetchingRef = useRef(false);

  const fetchPage = useCallback(async () => {
    if (fetchingRef.current || !hasMoreRef.current) {
      return;
    }
    fetchingRef.current = true;
    try {
      const page = await CameraRoll.getPhotos({
        first: PAGE_SIZE,
        after: cursorRef.current,
        assetType: 'Photos',
      });
      cursorRef.current = page.page_info.end_cursor;
      hasMoreRef.current = page.page_info.has_next_page;
      setPhotos(prev => [...prev, ...page.edges]);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  useEffect(() => {
    if (photos.length < REFILL_THRESHOLD && hasMoreRef.current) {
      fetchPage();
    }
  }, [photos.length, fetchPage]);

  const consumeTop = useCallback(() => {
    setPhotos(prev => prev.slice(1));
  }, []);

  return { photos, loading, consumeTop };
}
