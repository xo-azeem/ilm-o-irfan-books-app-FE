import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AppearanceScreen } from '@/features/profile/screens/AppearanceScreen';
import { DownloadsScreen } from '@/features/profile/screens/DownloadsScreen';
import { HelpCenterScreen } from '@/features/profile/screens/HelpCenterScreen';
import { LanguageScreen } from '@/features/profile/screens/LanguageScreen';
import { NotificationsScreen } from '@/features/profile/screens/NotificationsScreen';
import { PersonalDetailsScreen } from '@/features/profile/screens/PersonalDetailsScreen';
import { PrivacySecurityScreen } from '@/features/profile/screens/PrivacySecurityScreen';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';
import { SettingsScreen } from '@/features/profile/screens/SettingsScreen';
import { SubscriptionScreen } from '@/features/profile/screens/SubscriptionScreen';
import { useTheme } from '@/theme/ThemeContext';

import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileNavigator() {
  const { colors } = useTheme();
  const contentStyle = useMemo(
    () => ({ flex: 1, backgroundColor: colors.background }),
    [colors.background],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle,
          freezeOnBlur: true,
        }}>
        <Stack.Screen name="ProfileMain" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="Downloads" component={DownloadsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Appearance" component={AppearanceScreen} />
        <Stack.Screen name="Language" component={LanguageScreen} />
        <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
        <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
      </Stack.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
