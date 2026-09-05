module.exports = {
  preset: '@react-native/jest-preset',
  // native/*/ is a separate native subpackage (no Jest tests yet) — not
  // part of the RN app and must not be swept up by the root Jest run.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/native/'],
  moduleNameMapper: {
    '^react-native-vision-camera$': '<rootDir>/__mocks__/react-native-vision-camera.ts',
    '^react-native-vision-camera-hand-landmarker$':
      '<rootDir>/__mocks__/react-native-vision-camera-hand-landmarker.ts',
    '^react-native-vision-camera-worklets$':
      '<rootDir>/__mocks__/react-native-vision-camera-worklets.ts',
    '^react-native-worklets$': '<rootDir>/__mocks__/react-native-worklets.ts',
    '^@react-native-camera-roll/camera-roll$':
      '<rootDir>/__mocks__/@react-native-camera-roll/camera-roll.ts',
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/@react-native-async-storage/async-storage.ts',
  },
};
