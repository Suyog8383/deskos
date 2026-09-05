// Manual mock — the real module installs native worklet-runtime bindings
// that don't exist in the Jest environment. Frame processors never
// actually run in tests (no real camera frames are produced), so these
// just need to be callable without throwing.
export const runOnJS =
  <Args extends unknown[], Return>(fn: (...args: Args) => Return) =>
  (...args: Args) =>
    fn(...args);

export const runOnUI =
  <Args extends unknown[], Return>(fn: (...args: Args) => Return) =>
  (...args: Args) =>
    fn(...args);
