// Manual mock — the real package is a Nitro HybridObject used only at
// runtime by VisionCamera frame processors. Tests never run those.
export const provider = {
  createAsyncRunner: () => ({}),
  createRuntimeForThread: () => ({
    setOnFrameCallback: jest.fn(),
    setOnDepthFrameCallback: jest.fn(),
  }),
  bindUIUpdatesToController: () => ({ remove: jest.fn() }),
}
