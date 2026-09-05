import React, { useMemo, useRef } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import { PhotoIdentifier } from '@react-native-camera-roll/camera-roll';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const SWIPE_OUT_DURATION = 220;
// Cards rendered beneath the top one — this is the "preload buffer" so the
// next few full-res images are already mounted (and decoding) by the time
// they reach the top, without holding the whole gallery in memory.
const VISIBLE_CARDS = 3;

type Props = {
  photos: PhotoIdentifier[];
  onSwipeLeft: (photo: PhotoIdentifier) => void;
  onSwipeRight: (photo: PhotoIdentifier) => void;
  /** Imperative trigger so external inputs (hand gesture) can drive the same swipe. */
  triggerRef?: React.MutableRefObject<((direction: 'left' | 'right') => void) | null>;
};

export function SwipeDeck({ photos, onSwipeLeft, onSwipeRight, triggerRef }: Props) {
  const position = useRef(new Animated.ValueXY()).current;
  const top = photos[0];

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_evt, gesture) => {
          position.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD) {
            forceSwipe('right');
          } else if (gesture.dx < -SWIPE_THRESHOLD) {
            forceSwipe('left');
          } else {
            resetPosition();
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [top],
  );

  function forceSwipe(direction: 'left' | 'right') {
    const x = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  }

  function onSwipeComplete(direction: 'left' | 'right') {
    const photo = top;
    position.setValue({ x: 0, y: 0 });
    if (!photo) {
      return;
    }
    if (direction === 'right') {
      onSwipeRight(photo);
    } else {
      onSwipeLeft(photo);
    }
  }

  function resetPosition() {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  }

  if (triggerRef) {
    triggerRef.current = forceSwipe;
  }

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
    outputRange: ['-18deg', '0deg', '18deg'],
  });

  if (photos.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No more photos</Text>
      </View>
    );
  }

  return (
    <View style={styles.deck}>
      {photos
        .slice(0, VISIBLE_CARDS)
        .map((photo, index) => {
          if (index === 0) {
            return (
              <Animated.View
                key={photo.node.id}
                style={[
                  styles.card,
                  {
                    transform: [...position.getTranslateTransform(), { rotate }],
                  },
                ]}
                {...panResponder.panHandlers}>
                <Image source={{ uri: photo.node.image.uri }} style={styles.image} />
                <SwipeBadges position={position} />
              </Animated.View>
            );
          }
          return (
            <View
              key={photo.node.id}
              style={[
                styles.card,
                styles.stackedCard,
                { top: index * 8, transform: [{ scale: 1 - index * 0.04 }] },
              ]}>
              <Image source={{ uri: photo.node.image.uri }} style={styles.image} />
            </View>
          );
        })
        .reverse()}
    </View>
  );
}

function SwipeBadges({ position }: { position: Animated.ValueXY }) {
  const likeOpacity = position.x.interpolate({
    inputRange: [10, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -10],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  return (
    <>
      <Animated.View style={[styles.badge, styles.keepBadge, { opacity: likeOpacity }]}>
        <Text style={styles.badgeText}>KEEP</Text>
      </Animated.View>
      <Animated.View style={[styles.badge, styles.trashBadge, { opacity: nopeOpacity }]}>
        <Text style={styles.badgeText}>TRASH</Text>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  deck: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    height: '92%',
    overflow: 'hidden',
    position: 'absolute',
    width: '92%',
  },
  stackedCard: {
    backgroundColor: '#1a1a22',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  badge: {
    borderRadius: 8,
    borderWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: 'absolute',
    top: 40,
  },
  keepBadge: {
    borderColor: '#7bd88f',
    left: 24,
    transform: [{ rotate: '-12deg' }],
  },
  trashBadge: {
    borderColor: '#ed6a5a',
    right: 24,
    transform: [{ rotate: '12deg' }],
  },
  badgeText: {
    color: '#e7e7ef',
    fontSize: 20,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    color: '#8b8b9a',
    fontSize: 16,
  },
});
