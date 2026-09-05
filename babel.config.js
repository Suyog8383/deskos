module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Must be listed last — transforms 'worklet' directive functions (used by
  // useFrameOutput's onFrame callback) into standalone runnable closures.
  plugins: ['react-native-worklets/plugin'],
};
