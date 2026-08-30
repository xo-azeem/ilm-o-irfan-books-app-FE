import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { adminTabBar, tabBar } from '@/theme/palette';
import { useTheme, type AppColors } from '@/theme/ThemeContext';
import type { LucideIcon } from '@/components/ui/Icon';

export type TabItem = {
  Icon: LucideIcon;
  label: string;
};

export type TabBarVariant = 'reader' | 'admin';

type TabBarProps = BottomTabBarProps & {
  /** Keyed by route name, so each navigator supplies its own icon set. */
  items: Record<string, TabItem>;
  variant?: TabBarVariant;
};

/**
 * The floating tab bar.
 *
 * Two shapes, one component. The reader app gets a 31px capsule with a green
 * selection pill behind the active tab; admin gets a squarer 22px bar with no
 * pill at all, so the tool never feels like the reading app.
 *
 * There is deliberately no blur pass here. The design specifies a 92% opaque
 * surface, which reads the same and costs nothing on Android — a live blur
 * behind a scrolling list is exactly what drops frames on mid-range devices.
 */
export const TabBar = memo(function TabBar({
  state,
  navigation,
  items,
  variant = 'reader',
}: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const metrics = variant === 'admin' ? adminTabBar : tabBar;

  const tabs = state.routes.filter(route => items[route.name]);
  const focusedKey = state.routes[state.index]?.key;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          paddingBottom: Math.max(insets.bottom, 8) + metrics.gap,
          paddingHorizontal: metrics.inset,
        },
      ]}>
      <View
        style={[
          styles.bar,
          {
            height: metrics.height,
            borderRadius: metrics.radius,
            backgroundColor: colors.tabBarSurface,
            borderColor: colors.tabBarBorder,
          },
        ]}>
        {tabs.map(route => (
          <Tab
            key={route.key}
            item={items[route.name]}
            colors={colors}
            route={route}
            navigation={navigation}
            isFocused={route.key === focusedKey}
            variant={variant}
          />
        ))}
      </View>
    </View>
  );
});

type TabProps = {
  item: TabItem;
  colors: AppColors;
  route: BottomTabBarProps['state']['routes'][number];
  navigation: BottomTabBarProps['navigation'];
  isFocused: boolean;
  variant: TabBarVariant;
};

const PRESS_TIMING = {
  duration: 130,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

const Tab = memo(function Tab({
  item,
  colors,
  route,
  navigation,
  isFocused,
  variant,
}: TabProps) {
  const { Icon, label } = item;
  const pressed = useSharedValue(0);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressed.value === 1 ? 0.9 : 1, PRESS_TIMING) }],
  }));

  const handlePress = useCallback(() => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  }, [isFocused, navigation, route.key, route.name]);

  const handlePressIn = useCallback(() => {
    pressed.value = 1;
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = 0;
  }, [pressed]);

  // Only the reader bar draws a pill behind the active tab.
  const showPill = variant === 'reader' && isFocused;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tab}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}>
      <Animated.View
        style={[
          styles.tabInner,
          variant === 'admin' && styles.tabInnerAdmin,
          showPill && {
            paddingHorizontal: 16,
            borderRadius: 20,
            backgroundColor: colors.tabSelection,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: colors.tabSelectionRim,
          },
          pressStyle,
        ]}>
        <Icon
          size={variant === 'admin' ? 19 : 21}
          color={isFocused ? colors.tabActive : colors.tabInactive}
          strokeWidth={variant === 'admin' ? 1.8 : 1.7}
        />
        <Text
          size={variant === 'admin' ? 9 : 9.5}
          leading={1}
          weight={isFocused ? '600' : '500'}
          tracking={0.4}
          tone="inherit"
          numberOfLines={1}
          style={{ color: isFocused ? colors.tabActive : colors.tabInactive }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  tabInner: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  tabInnerAdmin: {
    paddingHorizontal: 6,
  },
});
