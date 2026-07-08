import { memo } from 'react';
import { Platform, Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  BookOpen,
  Home,
  Search,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { ROUTES, ROUTE_LABELS, type RouteName } from '@/constants/routes';
import { theme } from '@/theme/palette';

const CIRCLE_RADIUS = 20;
const TAB_BAR_HEIGHT = 70;

type TabConfig = {
  Icon: LucideIcon;
};

const TAB_CONFIG: Record<RouteName, TabConfig> = {
  [ROUTES.HOME]: { Icon: Home },
  [ROUTES.SEARCH]: { Icon: Search },
  [ROUTES.MY_LIBRARY]: { Icon: BookOpen },
  [ROUTES.PROFILE]: { Icon: UserRound },
};

export const CustomTabBar = memo(function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const insets = useSafeAreaInsets();
  const bottomPadding =
    Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 8);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          height: TAB_BAR_HEIGHT + bottomPadding,
          paddingBottom: bottomPadding,
        },
      ]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const config = TAB_CONFIG[route.name as RouteName];
        if (!config) {
          return null;
        }

        const { Icon } = config;
        const label = ROUTE_LABELS[route.name as RouteName];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={label}>
            {isFocused ? (
              <View
                style={[
                  styles.activeCircle,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.ink,
                  },
                ]}>
                <Icon size={20} color={colors.onPrimary} strokeWidth={2} />
              </View>
            ) : (
              <Icon
                size={22}
                color={colors.tabInactive}
                strokeWidth={1.75}
                style={styles.inactiveIcon}
              />
            )}

            <Text
              className={`text-[11px] ${
                isFocused
                  ? 'font-semibold text-app-primary dark:text-app-primary-dark'
                  : 'font-medium text-app-faint dark:text-app-faint-dark'
              }`}
              style={{
                marginTop: isFocused ? 16 : 4,
                opacity: isFocused ? 1 : 0.8,
              }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

export const customTabBarHeight = TAB_BAR_HEIGHT;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeCircle: {
    position: 'absolute',
    top: -12,
    width: CIRCLE_RADIUS * 2,
    height: CIRCLE_RADIUS * 2,
    borderRadius: CIRCLE_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  inactiveIcon: {
    marginBottom: 4,
  },
});
