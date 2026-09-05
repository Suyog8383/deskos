module.exports = {
  preset: '@react-native/jest-preset',
  // bridge/ and native/*/ are separate Node/native subpackages with their
  // own test runners (`node --test`, none yet, respectively) — they are
  // not part of the RN app and must not be swept up by the root Jest run.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/bridge/', '<rootDir>/native/'],
  moduleNameMapper: {
    '^react-native-vision-camera$': '<rootDir>/__mocks__/react-native-vision-camera.ts',
    '^react-native-vision-camera-hand-landmarker$':
      '<rootDir>/__mocks__/react-native-vision-camera-hand-landmarker.ts',
    '^react-native-worklets$': '<rootDir>/__mocks__/react-native-worklets.ts',
    '^@dr\\.pogodin/react-native-fs$': '<rootDir>/__mocks__/react-native-fs.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage.ts',
  },
};
