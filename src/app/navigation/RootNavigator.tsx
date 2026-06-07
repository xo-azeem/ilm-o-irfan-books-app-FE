import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Text, useColorScheme } from 'react-native';

import { ROUTES } from '@/constants/routes';
import { ExploreScreen } from '@/features/explore/screens/ExploreScreen';
import { HomeScreen } from '@/features/home/screens/HomeScreen';

import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

function HomeTabIcon({ color }: { color: string }) {
  return <Text className="text-lg" style={{ color }}>⌂</Text>;
}

function ExploreTabIcon({ color }: { color: string }) {
  return <Text className="text-lg" style={{ color }}>✦</Text>;
}

export function RootNavigator() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: isDark ? '#8fcfaa' : '#287851',
          tabBarInactiveTintColor: isDark ? '#94a3b8' : '#64748b',
          tabBarStyle: {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            borderTopColor: isDark ? '#1e293b' : '#e2e8f0',
          },
        }}>
        <Tab.Screen
          name={ROUTES.HOME}
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: HomeTabIcon,
          }}
        />
        <Tab.Screen
          name={ROUTES.EXPLORE}
          component={ExploreScreen}
          options={{
            tabBarLabel: 'Explore',
            tabBarIcon: ExploreTabIcon,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
