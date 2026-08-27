import { memo, useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { LucideIcon } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabBar as metrics } from '@/theme/palette';
import { useTheme, type AppColors } from '@/theme/ThemeContext';

const SELECTION_HEIGHT = 46;
const SELECTION_INSET = 6;
const ICON_SIZE = 23;
const PRESS_SCALE = 0.86;

const SELECTION_SPRING = { damping: 18, stiffness: 190, mass: 0.9 } as const;
const PRESS_TIMING = { duration: 130 } as const;

export type GlassTabItem = {
  Icon: LucideIcon;
  label: string;
};

type GlassTabBarProps = BottomTabBarProps & {
  /** Keyed by route name so each navigator supplies its own icon set. */
  items: Record<string, GlassTabItem>;
};

/**
 * Floating iOS-style glass capsule. It is absolutely positioned, so it overlays
 * the scene rather than consuming layout height — screens reserve room for it
 * through `useAppInsets`.
 */
export const GlassTabBar = memo(function GlassTabBar({
  state,
  navigation,
  items,
}: GlassTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const tabs = state.routes.filter(route => items[route.name]);
  const slotWidth = barWidth > 0 && tabs.length > 0 ? barWidth / tabs.length : 0;

  const focusedKey = state.routes[state.index]?.key;
  const focusedSlot = tabs.findIndex(route => route.key === focusedKey);

  const activeSlot = useSharedValue(0);

  useEffect(() => {
    if (focusedSlot >= 0) {
      activeSlot.value = focusedSlot;
    }
  }, [activeSlot, focusedSlot]);

  const selectionStyle = useAnimatedStyle(() => {
    if (slotWidth === 0) {
      return { opacity: 0 };
    }

    return {
      opacity: 1,
      width: slotWidth - SELECTION_INSET * 2,
      transform: [
        {
          translateX: withSpring(
            activeSlot.value * slotWidth + SELECTION_INSET,
            SELECTION_SPRING,
          ),
        },
      ],
    };
  }, [slotWidth]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  }, []);

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
          styles.capsule,
          {
            shadowColor: colors.glassShadow,
            shadowOpacity: isDark ? 0.5 : 0.14,
          },
        ]}>
        <View style={styles.clip} onLayout={handleLayout}>
          <BlurView
            style={styles.fill}
            blurType={isDark ? 'dark' : 'light'}
            blurAmount={isDark ? 20 : 26}
            reducedTransparencyFallbackColor={colors.surface}
            {...(Platform.OS === 'android'
              ? { overlayColor: 'transparent', blurRadius: 22, downsampleFactor: 4 }
              : null)}
          />

          <View
            pointerEvents="none"
            style={[styles.fill, { backgroundColor: colors.glassTint }]}
          />

          <Animated.View
            pointerEvents="none"
            style={[
              styles.selection,
              {
                backgroundColor: colors.glassSelection,
                borderColor: colors.glassSelectionRim,
              },
              selectionStyle,
            ]}
          />

          <View style={styles.row} pointerEvents="box-none">
            {tabs.map((route, index) => (
              <GlassTab
                key={route.key}
                item={items[route.name]}
                colors={colors}
                route={route}
                navigation={navigation}
                isFocused={index === focusedSlot}
              />
            ))}
          </View>

          {/* Inner bevel, drawn last so it sits above the blur and the tint. */}
          <View
            pointerEvents="none"
            style={[styles.fill, styles.stroke, { borderColor: colors.glassRim }]}
          />
        </View>

        {/* Outer stroke sits outside the clip so it is not cut in half. */}
        <View
          pointerEvents="none"
          style={[styles.fill, styles.stroke, { borderColor: colors.glassEdge }]}
        />
      </View>
    </View>
  );
});

type GlassTabProps = {
  item: GlassTabItem;
  colors: AppColors;
  route: BottomTabBarProps['state']['routes'][number];
  navigation: BottomTabBarProps['navigation'];
  isFocused: boolean;
};

const GlassTab = memo(function GlassTab({
  item,
  colors,
  route,
  navigation,
  isFocused,
}: GlassTabProps) {
  const { Icon, label } = item;
  const pressed = useSharedValue(0);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withTiming(
          pressed.value === 1 ? PRESS_SCALE : 1,
          PRESS_TIMING,
        ),
      },
    ],
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

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tab}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}>
      <Animated.View style={iconStyle}>
        <Icon
          size={ICON_SIZE}
          color={isFocused ? colors.tabActive : colors.tabInactive}
          strokeWidth={isFocused ? 2.3 : 1.8}
        />
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
  capsule: {
    borderRadius: metrics.radius,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
  },
  clip: {
    height: metrics.height,
    borderRadius: metrics.radius,
    overflow: 'hidden',
    // A near-invisible fill gives Android an outline to cast the elevation
    // shadow from; the blur paints over it, so it never shows through.
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    elevation: 12,
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  stroke: {
    borderRadius: metrics.radius,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selection: {
    position: 'absolute',
    left: 0,
    top: (metrics.height - SELECTION_HEIGHT) / 2,
    height: SELECTION_HEIGHT,
    borderRadius: SELECTION_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
