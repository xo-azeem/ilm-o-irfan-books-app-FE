import 'react-native-gesture-handler';

import { enableFreeze, enableScreens } from 'react-native-screens';
import { AppRegistry } from 'react-native';

import App from './App';
import { name as appName } from './app.json';

enableScreens(true);
enableFreeze(true);

AppRegistry.registerComponent(appName, () => App);
