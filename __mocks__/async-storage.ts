// Minimal in-memory mock of @react-native-async-storage/async-storage's
// default export (the surface src/files/folderStore.ts uses). Written by
// hand rather than pointing at the package's own jest mock, because that
// mock ships as ESM and isn't transformed under this repo's default Jest
// transformIgnorePatterns — same reasoning as the other __mocks__ entries.
const store = new Map<string, string>();

export default {
  getItem: jest.fn(async (key: string) => store.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    store.delete(key);
  }),
};
