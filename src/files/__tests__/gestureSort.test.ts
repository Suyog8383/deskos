import { interpretGestureAction } from '../gestureSort'
import type { SortFolder } from '../types'

const FOLDERS: SortFolder[] = [
  { id: 'favourite', name: 'Favourite', gesture: 'POINT_UP' },
  { id: 'school', name: 'School', gesture: 'THUMBS_UP' },
]

describe('interpretGestureAction', () => {
  it('copies on the assigned gesture shown with the right hand', () => {
    const action = interpretGestureAction(
      { gesture: 'POINT_UP', confidence: 0.9, handedness: 'Right' },
      FOLDERS,
      null,
      'file-1',
    )
    expect(action).toEqual({ type: 'copy', fileId: 'file-1', folderId: 'favourite' })
  })

  it('ignores the assigned gesture shown with the left hand', () => {
    const action = interpretGestureAction(
      { gesture: 'POINT_UP', confidence: 0.9, handedness: 'Left' },
      FOLDERS,
      null,
      'file-1',
    )
    expect(action).toBeNull()
  })

  it('deletes on swipe left regardless of folder assignments', () => {
    const action = interpretGestureAction(
      { gesture: 'SWIPE_LEFT', confidence: 0.6, handedness: 'Left' },
      FOLDERS,
      null,
      'file-1',
    )
    expect(action).toEqual({ type: 'delete', fileId: 'file-1' })
  })

  it('confirms a move on swipe right when a copy is pending for the same file', () => {
    const action = interpretGestureAction(
      { gesture: 'SWIPE_RIGHT', confidence: 0.6, handedness: 'Right' },
      FOLDERS,
      { fileId: 'file-1', folderId: 'favourite' },
      'file-1',
    )
    expect(action).toEqual({ type: 'confirmMove', fileId: 'file-1', folderId: 'favourite' })
  })

  it('does nothing on swipe right with no pending copy', () => {
    const action = interpretGestureAction(
      { gesture: 'SWIPE_RIGHT', confidence: 0.6, handedness: 'Right' },
      FOLDERS,
      null,
      'file-1',
    )
    expect(action).toBeNull()
  })

  it('does nothing on swipe right if the pending copy was for a different file', () => {
    const action = interpretGestureAction(
      { gesture: 'SWIPE_RIGHT', confidence: 0.6, handedness: 'Right' },
      FOLDERS,
      { fileId: 'file-2', folderId: 'favourite' },
      'file-1',
    )
    expect(action).toBeNull()
  })

  it('returns null when there is no current file', () => {
    const action = interpretGestureAction(
      { gesture: 'POINT_UP', confidence: 0.9, handedness: 'Right' },
      FOLDERS,
      null,
      null,
    )
    expect(action).toBeNull()
  })

  it('returns null when no folder claims the shown gesture', () => {
    const action = interpretGestureAction(
      { gesture: 'FIST', confidence: 0.9, handedness: 'Right' },
      FOLDERS,
      null,
      'file-1',
    )
    expect(action).toBeNull()
  })
})
