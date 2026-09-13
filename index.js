import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';

import { enableFreeze, enableScreens } from 'react-native-screens';
import { AppRegistry } from 'react-native';

import App from './App';
import { name as appName } from './app.json';
import { registerPushBackgroundHandler } from './src/services/push/background';

enableScreens(true);
enableFreeze(true);

// Must be registered outside the component tree: Android runs it in a
// headless task while the app is in the background or killed.
registerPushBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
