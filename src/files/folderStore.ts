import AsyncStorage from '@react-native-async-storage/async-storage'
import type { GestureLabel } from '../gesture/types'
import type { SortFolder } from './types'

const STORAGE_KEY = 'deskos:sortFolders'

/** Slugifies a folder name into a filesystem-safe directory name, with a
 * numeric suffix on collision so two folders never resolve to one dir. */
function slugify(name: string, existingIds: string[]): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'folder'
  let id = base
  let n = 2
  while (existingIds.includes(id)) {
    id = `${base}-${n}`
    n += 1
  }
  return id
}

export async function loadFolders(): Promise<SortFolder[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (raw == null) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function saveFolders(folders: SortFolder[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(folders))
}

export async function createFolder(name: string): Promise<SortFolder[]> {
  const folders = await loadFolders()
  const id = slugify(name, folders.map(f => f.id))
  const next = [...folders, { id, name: name.trim(), gesture: null }]
  await saveFolders(next)
  return next
}

export async function assignGesture(folderId: string, gesture: GestureLabel | null): Promise<SortFolder[]> {
  const folders = await loadFolders()
  // A gesture can only drive one folder at a time — reassigning it here
  // clears it from whichever other folder was previously using it.
  const next = folders.map(f => {
    if (f.id === folderId) return { ...f, gesture }
    if (gesture != null && f.gesture === gesture) return { ...f, gesture: null }
    return f
  })
  await saveFolders(next)
  return next
}

export async function deleteFolder(folderId: string): Promise<SortFolder[]> {
  const folders = await loadFolders()
  const next = folders.filter(f => f.id !== folderId)
  await saveFolders(next)
  return next
}
