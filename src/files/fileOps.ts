import * as RNFS from '@dr.pogodin/react-native-fs'
import type { ManagedFile } from './types'

// Everything lives inside the app's own sandboxed document directory —
// never the shared Gallery/MediaStore. That's a deliberate scoping choice:
// an app's own storage needs zero runtime permissions on any Android
// version, which sidesteps the scoped-storage delete/move consent-dialog
// problem entirely. Real "import from the system Gallery" (which *would*
// need that permission work) is intentionally out of scope for now — see
// `seedInboxIfEmpty` below for the stand-in.
const ROOT_DIR = `${RNFS.DocumentDirectoryPath}/DeskOS`
const INBOX_DIR = `${ROOT_DIR}/Inbox`

// A minimal valid 1x1 PNG, used purely as placeholder content so the
// gesture-sort flow has something to sort before real gallery import is
// wired up. Visual content doesn't matter here — only that Inbox starts
// non-empty and each file is a distinct, real image file on disk.
const PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

export function folderDirPath(folderId: string): string {
  return `${ROOT_DIR}/${folderId}`
}

export async function ensureFolderDir(folderId: string): Promise<void> {
  await RNFS.mkdir(folderDirPath(folderId))
}

export async function removeFolderDir(folderId: string): Promise<void> {
  const dir = folderDirPath(folderId)
  if (await RNFS.exists(dir)) await RNFS.unlink(dir)
}

async function seedInboxIfEmpty(): Promise<void> {
  const entries = await RNFS.readDir(INBOX_DIR)
  if (entries.length > 0) return
  for (let i = 1; i <= 3; i += 1) {
    await RNFS.writeFile(`${INBOX_DIR}/sample-${i}.png`, PLACEHOLDER_PNG_BASE64, 'base64')
  }
}

/** Creates the DeskOS root/Inbox directories on first run and seeds demo
 * files so the sorter has something to show. Safe to call on every mount. */
export async function ensureRoot(): Promise<void> {
  if (!(await RNFS.exists(ROOT_DIR))) await RNFS.mkdir(ROOT_DIR)
  if (!(await RNFS.exists(INBOX_DIR))) await RNFS.mkdir(INBOX_DIR)
  await seedInboxIfEmpty()
}

export async function listInboxFiles(): Promise<ManagedFile[]> {
  const entries = await RNFS.readDir(INBOX_DIR)
  return entries
    .filter(e => e.isFile())
    .map(e => ({ id: e.name, name: e.name, path: e.path }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function copyToFolder(file: ManagedFile, folderId: string): Promise<void> {
  await ensureFolderDir(folderId)
  await RNFS.copyFile(file.path, `${folderDirPath(folderId)}/${file.name}`)
}

/** Deletes the Inbox original. Used both for the plain "swipe left" delete
 * and to finish a pending copy-then-confirm-move (the copy already
 * happened, so this is the only step a "move" still needs). */
export async function deleteInboxFile(file: ManagedFile): Promise<void> {
  await RNFS.unlink(file.path)
}
