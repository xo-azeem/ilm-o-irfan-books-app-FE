import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';

import { enableFreeze, enableScreens } from 'react-native-screens';
import { AppRegistry } from 'react-native';

import App from './App';
import { name as appName } from './app.json';

enableScreens(true);
enableFreeze(true);

AppRegistry.registerComponent(appName, () => App);
