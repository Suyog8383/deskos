import React from 'react';
import { View } from 'react-native';

export const Camera = () => React.createElement(View, { testID: 'camera-preview' });

export const useCameraDevice = () => ({
  localizedName: 'Mock camera',
});

export const useCameraPermission = () => ({
  hasPermission: true,
  requestPermission: jest.fn(),
});

export const useMicrophonePermission = () => ({
  hasPermission: true,
  requestPermission: jest.fn(),
});

export const usePhotoOutput = () => ({
  capturePhotoToFile: jest.fn(async () => ({ filePath: '/mock/frame.jpg' })),
});