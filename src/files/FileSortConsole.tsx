import React, { useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera'
import type { GestureLabel } from '../gesture/types'
import { ASSIGNABLE_GESTURES } from './types'
import { useFileSorter } from './useFileSorter'

const GESTURE_LABELS: Record<string, string> = {
  OPEN_PALM: 'Open palm',
  FIST: 'Fist',
  THUMBS_UP: 'Thumbs up',
  THUMBS_DOWN: 'Thumbs down',
  POINT_UP: 'Point up',
  POINT_DOWN: 'Point down',
  PINCH: 'Pinch',
}

/**
 * Gesture-driven file sorter — browses `DeskOS/Inbox` and lets the user
 * copy/move/delete files with the right hand instead of tapping through a
 * file manager. See `gestureSort.ts` for the copy/delete/move-confirm
 * rules and `fileOps.ts` for why this only ever touches the app's own
 * sandboxed storage (no gallery import yet — that needs runtime storage
 * permission, deliberately deferred).
 */
export function FileSortConsole() {
  const device = useCameraDevice('front')
  const { hasPermission, requestPermission } = useCameraPermission()
  const sorter = useFileSorter()
  const [newFolderName, setNewFolderName] = useState('')
  // Set once the user submits a folder name — while non-null, the console
  // shows a gesture picker instead of the name field, and the folder isn't
  // actually created until one is chosen (or the picker is cancelled).
  const [pendingFolderName, setPendingFolderName] = useState<string | null>(null)

  React.useEffect(() => {
    if (!hasPermission) requestPermission()
  }, [hasPermission, requestPermission])

  const canRenderCamera = hasPermission && device != null
  const usedGestures = new Set(
    sorter.folders.map(f => f.gesture).filter((g): g is GestureLabel => g != null),
  )

  // The tap-to-cycle order for one folder: every assignable gesture not
  // already claimed by a DIFFERENT folder (so this folder's own current
  // gesture, if any, stays in the list at its natural position), then
  // "unassigned" at the end — tapping repeatedly walks this list and
  // wraps back to unassigned rather than skipping it.
  function cycleOptionsFor(folder: { id: string; gesture: GestureLabel | null }): (GestureLabel | null)[] {
    const usedByOthers = new Set(
      sorter.folders.filter(f => f.id !== folder.id).map(f => f.gesture).filter((g): g is GestureLabel => g != null),
    )
    return [...ASSIGNABLE_GESTURES.filter(g => !usedByOthers.has(g)), null]
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.previewPane}>
        {canRenderCamera ? (
          <Camera style={StyleSheet.absoluteFill} device={device} isActive outputs={[sorter.frameOutput]} />
        ) : (
          <View style={styles.previewFallback}>
            <Text style={styles.fallbackTitle}>CAMERA OFFLINE</Text>
            <Text style={styles.fallbackText}>
              {!hasPermission ? 'Camera permission is required.' : 'Searching for a front camera...'}
            </Text>
          </View>
        )}
        <View style={styles.gestureBadge}>
          <Text style={styles.gestureBadgeText}>
            {sorter.gesture.gesture ? GESTURE_LABELS[sorter.gesture.gesture] ?? sorter.gesture.gesture : 'No gesture'}
            {sorter.gesture.handedness ? ` · ${sorter.gesture.handedness}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.consolePane}>
        <Text style={styles.eyebrow}>DESKOS / SORT</Text>
        <Text style={styles.title}>Inbox ({sorter.files.length})</Text>

        <View style={styles.imageStage}>
          {sorter.currentFile != null ? (
            <Image source={{ uri: `file://${sorter.currentFile.path}` }} style={styles.image} resizeMode="cover" />
          ) : (
            <Text style={styles.fallbackText}>{sorter.ready ? 'Inbox is empty.' : 'Loading...'}</Text>
          )}
        </View>

        {sorter.currentFile != null && (
          <>
            <Text style={styles.fileName}>{sorter.currentFile.name}</Text>
            {sorter.pendingMove?.fileId === sorter.currentFile.id && (
              <Text style={styles.pendingBanner}>Copied — swipe right again to move instead</Text>
            )}
            <View style={styles.navRow}>
              <NavButton label="PREV" onPress={sorter.goPrev} />
              <NavButton label="NEXT" onPress={sorter.goNext} />
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>FOLDERS</Text>
        {sorter.folders.map(folder => (
          <View key={folder.id} style={styles.folderRow}>
            <Text style={styles.folderName}>{folder.name}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const options = cycleOptionsFor(folder)
                const idx = options.indexOf(folder.gesture)
                const nextGesture = options[(idx + 1) % options.length] ?? null
                void sorter.assignGesture(folder.id, nextGesture)
              }}
              style={styles.gestureChip}>
              <Text style={styles.gestureChipText}>
                {folder.gesture ? GESTURE_LABELS[folder.gesture] ?? folder.gesture : 'Tap to assign'}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void sorter.deleteFolder(folder.id)}>
              <Text style={styles.removeFolder}>×</Text>
            </Pressable>
          </View>
        ))}

        {pendingFolderName == null ? (
          <View style={styles.newFolderRow}>
            <TextInput
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="New folder name"
              placeholderTextColor="#5c7276"
              style={styles.newFolderInput}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const trimmed = newFolderName.trim()
                if (trimmed.length === 0) return
                setPendingFolderName(trimmed)
                setNewFolderName('')
              }}
              style={styles.addFolderButton}>
              <Text style={styles.addFolderButtonText}>ADD</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.gesturePicker}>
            <Text style={styles.gesturePickerTitle}>Assign a gesture to "{pendingFolderName}"</Text>
            <View style={styles.gestureOptionRow}>
              {ASSIGNABLE_GESTURES.filter(g => !usedGestures.has(g)).length === 0 ? (
                <Text style={styles.fallbackText}>
                  All gestures are already assigned — free one up first, or skip.
                </Text>
              ) : (
                ASSIGNABLE_GESTURES.filter(g => !usedGestures.has(g)).map(g => (
                  <Pressable
                    key={g}
                    accessibilityRole="button"
                    onPress={() => {
                      void sorter.createFolder(pendingFolderName, g)
                      setPendingFolderName(null)
                    }}
                    style={styles.gestureOption}>
                    <Text style={styles.gestureOptionText}>{GESTURE_LABELS[g] ?? g}</Text>
                  </Pressable>
                ))
              )}
            </View>
            <View style={styles.gesturePickerActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void sorter.createFolder(pendingFolderName, null)
                  setPendingFolderName(null)
                }}>
                <Text style={styles.gesturePickerSkip}>Skip for now</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setPendingFolderName(null)}>
                <Text style={styles.gesturePickerCancel}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>ACTIVITY</Text>
        <View style={styles.logBox}>
          {sorter.log.length === 0 ? (
            <Text style={styles.logText}>No actions yet.</Text>
          ) : (
            sorter.log.map((line, i) => (
              <Text key={i} style={styles.logText}>
                {line}
              </Text>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  )
}

function NavButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.navButton}>
      <Text style={styles.navButtonText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071018',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  previewPane: {
    height: 220,
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
  gestureBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 16, 24, 0.72)',
    flexDirection: 'row',
    left: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'absolute',
    top: 18,
  },
  gestureBadgeText: {
    color: '#e7f3f1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
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
  title: {
    color: '#e7f3f1',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 5,
  },
  imageStage: {
    alignItems: 'center',
    backgroundColor: '#0d1a22',
    height: 220,
    justifyContent: 'center',
    marginTop: 16,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  fileName: {
    color: '#8ba5a8',
    fontSize: 12,
    marginTop: 8,
  },
  pendingBanner: {
    backgroundColor: '#2a3a20',
    color: '#c7e6a0',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    padding: 8,
  },
  navRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  navButton: {
    backgroundColor: '#152530',
    flex: 1,
    paddingVertical: 10,
  },
  navButtonText: {
    color: '#e7f3f1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  sectionLabel: {
    color: '#ed6a5a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginTop: 24,
  },
  folderRow: {
    alignItems: 'center',
    borderBottomColor: '#20313a',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  folderName: {
    color: '#e7f3f1',
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  gestureChip: {
    backgroundColor: '#152530',
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gestureChipText: {
    color: '#8ba5a8',
    fontSize: 11,
    fontWeight: '700',
  },
  removeFolder: {
    color: '#ed6a5a',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  newFolderRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  newFolderInput: {
    backgroundColor: '#0d1a22',
    color: '#e7f3f1',
    flex: 1,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addFolderButton: {
    alignItems: 'center',
    backgroundColor: '#ed6a5a',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  addFolderButtonText: {
    color: '#071018',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gesturePicker: {
    backgroundColor: '#0d1a22',
    marginTop: 14,
    padding: 14,
  },
  gesturePickerTitle: {
    color: '#e7f3f1',
    fontSize: 13,
    fontWeight: '700',
  },
  gestureOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  gestureOption: {
    backgroundColor: '#152530',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  gestureOptionText: {
    color: '#e7f3f1',
    fontSize: 12,
    fontWeight: '700',
  },
  gesturePickerActions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 14,
  },
  gesturePickerSkip: {
    color: '#8ba5a8',
    fontSize: 12,
    fontWeight: '600',
  },
  gesturePickerCancel: {
    color: '#ed6a5a',
    fontSize: 12,
    fontWeight: '600',
  },
  logBox: {
    backgroundColor: '#0d1a22',
    marginTop: 10,
    padding: 13,
  },
  logText: {
    color: '#9db2b3',
    fontSize: 12,
    lineHeight: 20,
  },
})
