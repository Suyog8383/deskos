import type { GestureLabel } from '../gesture/types'

/**
 * Gestures available to assign to a sort folder. Deliberately excludes
 * `SWIPE_LEFT`/`SWIPE_RIGHT` — those are reserved globally for delete and
 * move-confirm (see `gestureSort.ts`), not assignable per folder.
 */
export const ASSIGNABLE_GESTURES: GestureLabel[] = [
  'OPEN_PALM',
  'FIST',
  'THUMBS_UP',
  'THUMBS_DOWN',
  'POINT_UP',
  'POINT_DOWN',
  'PINCH',
]

export interface SortFolder {
  id: string
  name: string
  gesture: GestureLabel | null
}

export interface ManagedFile {
  id: string
  name: string
  path: string
}

/** Set right after a gesture-copy, so a follow-up SWIPE_RIGHT on the same
 * file can be read as "actually, move it" instead of "copy it again". */
export interface PendingMove {
  fileId: string
  folderId: string
}

export type SortAction =
  | { type: 'copy'; fileId: string; folderId: string }
  | { type: 'delete'; fileId: string }
  | { type: 'confirmMove'; fileId: string; folderId: string }
