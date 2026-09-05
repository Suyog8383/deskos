import { useCallback, useEffect, useRef, useState } from 'react'
import type { CameraFrameOutput } from 'react-native-vision-camera'
import { useHandGesture } from '../gesture/useHandGesture'
import type { GestureLabel } from '../gesture/types'
import { interpretGestureAction } from './gestureSort'
import * as folderStore from './folderStore'
import * as fileOps from './fileOps'
import type { ManagedFile, PendingMove, SortAction, SortFolder } from './types'

const LOG_LIMIT = 6

function folderName(folders: SortFolder[], folderId: string): string {
  return folders.find(f => f.id === folderId)?.name ?? folderId
}

export function useFileSorter(): {
  frameOutput: CameraFrameOutput
  gesture: ReturnType<typeof useHandGesture>['state']
  folders: SortFolder[]
  files: ManagedFile[]
  currentFile: ManagedFile | null
  pendingMove: PendingMove | null
  log: string[]
  ready: boolean
  goNext: () => void
  goPrev: () => void
  createFolder: (name: string, gesture: GestureLabel | null) => Promise<void>
  assignGesture: (folderId: string, gesture: GestureLabel | null) => Promise<void>
  deleteFolder: (folderId: string) => Promise<void>
} {
  const { frameOutput, state: gesture } = useHandGesture()

  const [ready, setReady] = useState(false)
  const [folders, setFolders] = useState<SortFolder[]>([])
  const [files, setFiles] = useState<ManagedFile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [log, setLog] = useState<string[]>([])

  const appendLog = useCallback((line: string) => {
    setLog(prev => [line, ...prev].slice(0, LOG_LIMIT))
  }, [])

  useEffect(() => {
    let cancelled = false
    async function init() {
      await fileOps.ensureRoot()
      const [loadedFolders, loadedFiles] = await Promise.all([folderStore.loadFolders(), fileOps.listInboxFiles()])
      if (cancelled) return
      setFolders(loadedFolders)
      setFiles(loadedFiles)
      setReady(true)
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [])

  const currentFile = files[currentIndex] ?? null

  const removeCurrentFile = useCallback((fileId: string) => {
    // files.length here is the pre-removal count, so length - 2 is the
    // last valid index once this file is filtered out.
    setFiles(prev => prev.filter(f => f.id !== fileId))
    setCurrentIndex(prev => Math.min(prev, Math.max(0, files.length - 2)))
    setPendingMove(prev => (prev?.fileId === fileId ? null : prev))
  }, [files.length])

  const handleAction = useCallback(
    async (action: SortAction, file: ManagedFile) => {
      if (action.type === 'delete') {
        await fileOps.deleteInboxFile(file)
        removeCurrentFile(file.id)
        appendLog(`Deleted ${file.name}`)
      } else if (action.type === 'copy') {
        await fileOps.copyToFolder(file, action.folderId)
        setPendingMove({ fileId: file.id, folderId: action.folderId })
        appendLog(`Copied ${file.name} -> ${folderName(folders, action.folderId)}`)
      } else if (action.type === 'confirmMove') {
        await fileOps.deleteInboxFile(file)
        removeCurrentFile(file.id)
        appendLog(`Moved ${file.name} -> ${folderName(folders, action.folderId)}`)
      }
    },
    [folders, removeCurrentFile, appendLog],
  )

  // Edge-triggers gesture actions: a held static gesture re-reports the
  // same label every frame, but it should only fire the action once, on
  // the frame it first appears — otherwise holding POINT_UP over a file
  // would try to copy it dozens of times a second.
  const lastHandledRef = useRef<string | null>(null)
  useEffect(() => {
    if (gesture.gesture == null) {
      lastHandledRef.current = null
      return
    }
    if (currentFile == null) return

    const signature = `${gesture.gesture}:${gesture.handedness}:${currentFile.id}`
    if (lastHandledRef.current === signature) return
    lastHandledRef.current = signature

    const action = interpretGestureAction(gesture, folders, pendingMove, currentFile.id)
    if (action != null) void handleAction(action, currentFile)
  }, [gesture, currentFile, folders, pendingMove, handleAction])

  const goNext = useCallback(() => {
    setPendingMove(null)
    setCurrentIndex(prev => Math.min(prev + 1, Math.max(0, files.length - 1)))
  }, [files.length])

  const goPrev = useCallback(() => {
    setPendingMove(null)
    setCurrentIndex(prev => Math.max(prev - 1, 0))
  }, [])

  // Gesture assignment happens as part of creation (the console prompts
  // for it right after the name), not as a separate step afterwards — a
  // folder created with no gesture stays that way until the user taps its
  // chip later.
  const createFolder = useCallback(async (name: string, gestureLabel: GestureLabel | null) => {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    const created = await folderStore.createFolder(trimmed)
    const newFolder = created[created.length - 1]
    if (newFolder == null) return
    await fileOps.ensureFolderDir(newFolder.id)
    const finalFolders = gestureLabel != null ? await folderStore.assignGesture(newFolder.id, gestureLabel) : created
    setFolders(finalFolders)
  }, [])

  const assignGesture = useCallback(async (folderId: string, gestureLabel: GestureLabel | null) => {
    const next = await folderStore.assignGesture(folderId, gestureLabel)
    setFolders(next)
  }, [])

  const removeFolder = useCallback(async (folderId: string) => {
    const next = await folderStore.deleteFolder(folderId)
    setFolders(next)
    await fileOps.removeFolderDir(folderId)
  }, [])

  return {
    frameOutput,
    gesture,
    folders,
    files,
    currentFile,
    pendingMove,
    log,
    ready,
    goNext,
    goPrev,
    createFolder,
    assignGesture,
    deleteFolder: removeFolder,
  }
}
