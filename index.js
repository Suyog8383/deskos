/**
 * @format
 */

// Must load before VisionCamera frame processors. useFrameOutput() lazy-requires
// these inside a try/catch, which Metro treats as optional — a stale bundle then
// crashes Gesture Control with "`react-native-vision-camera-worklets` is not installed".
import 'react-native-worklets';
import 'react-native-vision-camera-worklets';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
