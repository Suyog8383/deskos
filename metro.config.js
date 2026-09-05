const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Prevent Metro from scanning the backend server folder.
    // server/ uses Node.js-only packages (ws, nut-js, etc.) that are
    // incompatible with the React Native bundler.
    blockList: [/server\/.*/],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
