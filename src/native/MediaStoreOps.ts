import { NativeModules } from 'react-native';

type MediaStoreOpsNative = {
  trashPhoto: (uri: string) => Promise<boolean>;
  moveToAlbum: (uri: string, albumName: string) => Promise<boolean>;
};

export const MediaStoreOps = NativeModules.MediaStoreOps as MediaStoreOpsNative;
