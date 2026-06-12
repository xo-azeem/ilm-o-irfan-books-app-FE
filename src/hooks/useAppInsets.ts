import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '@/theme/palette';

const SCROLL_END_PADDING = 20;
const FLOATING_TAB_OVERFLOW = 12;

export function useAppInsets() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  const tabBarHeight = layout.tabBarHeight + bottomInset;

  return {
    insets,
    tabBarHeight,
    tabBarPaddingBottom: bottomInset,
    scrollBottomInset: tabBarHeight + FLOATING_TAB_OVERFLOW + SCROLL_END_PADDING,
    scrollEndPadding: SCROLL_END_PADDING + FLOATING_TAB_OVERFLOW,
  };
}
