const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [path.resolve(__dirname, 'native/vision-camera-hand-landmarker')],
  resolver: {
    extraNodeModules: {
      'react-native-vision-camera-hand-landmarker': path.resolve(
        __dirname,
        'native/vision-camera-hand-landmarker',
      ),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
