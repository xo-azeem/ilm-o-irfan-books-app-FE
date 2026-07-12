import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { useAppInsets } from '@/hooks/useAppInsets';

export const SEARCH_GRID_GAP = 16;
export const SEARCH_GRID_ROW_GAP = 24;
export const SEARCH_GRID_SCREEN_PADDING = 20;
export const SEARCH_CARD_BODY_HEIGHT = 133;
export const SEARCH_CARD_COVER_ASPECT = 1.32;

const REFERENCE_SAFE_VIEWPORT_HEIGHT = 720;
const TAB_BAR_CLEARANCE = 12;

export function useSearchGridMetrics() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { insets, tabBarHeight } = useAppInsets();

  return useMemo(() => {
    const cardWidth =
      (screenWidth - SEARCH_GRID_SCREEN_PADDING * 2 - SEARCH_GRID_GAP) / 2;

    const safeViewportHeight =
      screenHeight - insets.top - tabBarHeight - TAB_BAR_CLEARANCE;

    const heightScale = Math.min(
      1.1,
      Math.max(0.9, safeViewportHeight / REFERENCE_SAFE_VIEWPORT_HEIGHT),
    );

    const coverHeight = Math.round(cardWidth * SEARCH_CARD_COVER_ASPECT * heightScale);
    const cardHeight = coverHeight + SEARCH_CARD_BODY_HEIGHT;

    return {
      cardWidth,
      cardHeight,
      coverHeight,
      bodyHeight: SEARCH_CARD_BODY_HEIGHT,
      columnGap: SEARCH_GRID_GAP,
      rowGap: SEARCH_GRID_ROW_GAP,
    };
  }, [screenWidth, screenHeight, insets.top, tabBarHeight]);
}
