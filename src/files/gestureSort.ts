import type { HandGestureState } from '../gesture/types'
import type { PendingMove, SortAction, SortFolder } from './types'

/**
 * Pure gesture → file-action interpretation for the gesture-sort flow.
 * Kept separate from `useFileSorter` so the copy/delete/move-confirm rules
 * can be unit tested without touching AsyncStorage, RNFS, or the camera.
 *
 * Rules:
 * - A folder's assigned gesture, shown with the RIGHT hand, copies the
 *   current file into that folder.
 * - SWIPE_LEFT deletes the current file outright (no assignment needed).
 * - SWIPE_RIGHT only does something if the current file was just copied
 *   by the rule above (`pendingMove` matches it) — in that case it
 *   confirms a move: the copy already happened, so this just removes the
 *   original. A bare SWIPE_RIGHT with nothing pending is a no-op, not a
 *   fallback copy — this is deliberately narrower than the assigned-gesture
 *   copy rule so an accidental swipe can't silently reassign a file.
 */
export function interpretGestureAction(
  state: HandGestureState,
  folders: SortFolder[],
  pendingMove: PendingMove | null,
  currentFileId: string | null,
): SortAction | null {
  if (state.gesture == null || currentFileId == null) return null

  if (state.gesture === 'SWIPE_LEFT') {
    return { type: 'delete', fileId: currentFileId }
  }

  if (state.gesture === 'SWIPE_RIGHT') {
    if (pendingMove != null && pendingMove.fileId === currentFileId) {
      return { type: 'confirmMove', fileId: currentFileId, folderId: pendingMove.folderId }
    }
    return null
  }

  // MediaPipe handedness is reported from the raw front-camera frame, which
  // may or may not be mirrored to match what the user sees on screen —
  // unverified on a real device (see useHandGesture.ts's on-device caveat).
  // If "right hand" ends up inverted in practice, flip this check.
  if (state.handedness === 'Right') {
    const folder = folders.find(f => f.gesture === state.gesture)
    if (folder != null) {
      return { type: 'copy', fileId: currentFileId, folderId: folder.id }
    }
  }

  return null
}
