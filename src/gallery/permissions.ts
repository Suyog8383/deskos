import { PermissionsAndroid, Platform } from 'react-native';

export async function requestGalleryPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permission =
    Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
