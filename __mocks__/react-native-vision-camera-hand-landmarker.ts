// Manual mock — the real module is a Nitro HybridObject backed by native
// MediaPipe bindings, which don't exist in the Jest environment.
export const HandLandmarker = {
  detect: jest.fn(() => []),
};
