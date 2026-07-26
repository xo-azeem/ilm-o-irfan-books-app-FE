import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const REF_WIDTH = 390;
const REF_SAFE_HEIGHT = 720;

/**
 * Responsive logo + app-name sizing for screen headers.
 * Scales with window size and remaining height inside the safe area.
 */
export function useHeaderBrandMetrics() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const safeHeight = screenHeight - insets.top - insets.bottom;
    const widthScale = Math.min(1.2, Math.max(0.85, screenWidth / REF_WIDTH));
    const heightScale = Math.min(1.15, Math.max(0.88, safeHeight / REF_SAFE_HEIGHT));
    const scale = Math.min(widthScale, heightScale);

    const logoSize = Math.round(Math.min(58, Math.max(46, 52 * scale)));
    const titleSize = Math.round(Math.min(28, Math.max(22, 24 * scale)));
    const titleLineHeight = Math.round(titleSize * 1.2);
    const subtitleSize = Math.round(Math.min(14, Math.max(11, 12 * scale)));
    const brandGap = Math.round(Math.min(14, Math.max(10, 12 * scale)));
    const profileBtnSize = Math.round(Math.min(48, Math.max(40, logoSize * 0.88)));
    const profileIconSize = Math.round(profileBtnSize * 0.5);
    const paddingTop = Math.round(Math.min(16, Math.max(10, 12 * scale)));
    const paddingBottom = Math.round(Math.min(16, Math.max(12, 14 * scale)));
    const stageHeaderSpace = paddingTop + logoSize + paddingBottom;

    return {
      logoSize,
      titleSize,
      titleLineHeight,
      subtitleSize,
      brandGap,
      profileBtnSize,
      profileIconSize,
      paddingTop,
      paddingBottom,
      stageHeaderSpace,
      topInset: insets.top,
    };
  }, [screenWidth, screenHeight, insets.top, insets.bottom]);
}
