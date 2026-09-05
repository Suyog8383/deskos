// Minimal in-memory mock of the @dr.pogodin/react-native-fs surface that
// src/files/fileOps.ts uses, so `App.test.tsx` (which renders the full
// <App />, including FileSortConsole) doesn't hit a real native module.
const files = new Map<string, string>();
const dirs = new Set<string>();

export const DocumentDirectoryPath = '/mock/documents';

export const mkdir = jest.fn(async (path: string) => {
  dirs.add(path);
});

export const exists = jest.fn(async (path: string) => dirs.has(path) || files.has(path));

export const writeFile = jest.fn(async (path: string, content: string) => {
  files.set(path, content);
});

export const readDir = jest.fn(async (dirPath: string) => {
  const prefix = `${dirPath}/`;
  return Array.from(files.keys())
    .filter(p => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'))
    .map(p => ({
      name: p.slice(prefix.length),
      path: p,
      size: 0,
      mtime: null,
      ctime: null,
      isFile: () => true,
      isDirectory: () => false,
    }));
});

export const copyFile = jest.fn(async (from: string, into: string) => {
  const content = files.get(from) ?? '';
  files.set(into, content);
});

export const unlink = jest.fn(async (path: string) => {
  files.delete(path);
  dirs.delete(path);
});
