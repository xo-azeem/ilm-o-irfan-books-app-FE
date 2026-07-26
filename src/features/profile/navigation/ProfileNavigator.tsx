import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AboutScreen } from '@/features/profile/screens/AboutScreen';
import { AppearanceScreen } from '@/features/profile/screens/AppearanceScreen';
import { DownloadsScreen } from '@/features/profile/screens/DownloadsScreen';
import { HelpCenterScreen } from '@/features/profile/screens/HelpCenterScreen';
import { LanguageScreen } from '@/features/profile/screens/LanguageScreen';
import { NotificationsScreen } from '@/features/profile/screens/NotificationsScreen';
import { PersonalDetailsScreen } from '@/features/profile/screens/PersonalDetailsScreen';
import { PrivacySecurityScreen } from '@/features/profile/screens/PrivacySecurityScreen';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';
import { RateAppScreen } from '@/features/profile/screens/RateAppScreen';
import { SubscriptionScreen } from '@/features/profile/screens/SubscriptionScreen';

import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const STACK_CONTENT_STYLE = { flex: 1 } as const;

export function ProfileNavigator() {
  return (
    <View className="flex-1 bg-app-bg dark:bg-app-bg-dark">
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: STACK_CONTENT_STYLE,
          freezeOnBlur: true,
          detachInactiveScreens: true,
        }}>
        <Stack.Screen name="ProfileMain" component={ProfileScreen} />
        <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="Downloads" component={DownloadsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Appearance" component={AppearanceScreen} />
        <Stack.Screen name="Language" component={LanguageScreen} />
        <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
        <Stack.Screen name="RateApp" component={RateAppScreen} />
        <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
      </Stack.Navigator>
    </View>
  );
}
