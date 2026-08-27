import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabBar } from '@/theme/palette';

const SCROLL_END_PADDING = 20;

export function useAppInsets() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  // The glass capsule floats over the scene, so only screens rendered inside a
  // tab navigator need to reserve room for it. Stack screens pushed above the
  // tabs (book detail, reader, auth) have no bar and get a plain end padding.
  const hasTabBar = useContext(BottomTabBarHeightContext) !== undefined;

  /** Vertical space the floating capsule covers, measured from the screen bottom. */
  const tabBarHeight = tabBar.height + tabBar.gap + bottomInset;
  const contentBottomInset = hasTabBar ? tabBarHeight : bottomInset;

  return {
    insets,
    tabBarHeight,
    tabBarPaddingBottom: bottomInset,
    /** Keeps fixed-height content from sliding under the capsule. */
    contentBottomInset,
    /** Same clearance plus breathing room at the end of a scroll. */
    scrollEndPadding: contentBottomInset + SCROLL_END_PADDING,
  };
}
