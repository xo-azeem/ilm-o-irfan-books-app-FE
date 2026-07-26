import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONTENT_MAX_WIDTH = 420;

/**
 * Responsive auth spacing — scales with window size and safe-area insets
 * for a tight iOS-style login/sign-up layout.
 */
export function useAuthLayoutMetrics(scrollable: boolean) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const availableHeight = screenHeight - insets.top - insets.bottom;
    const availableWidth = screenWidth - insets.left - insets.right;
    const compact = availableHeight < 720;

    const horizontalPadding = Math.round(
      Math.min(28, Math.max(20, availableWidth * 0.06)),
    );
    const logoSize = Math.round(
      Math.min(44, Math.max(36, availableHeight * 0.052)),
    );
    const titleSize = Math.round(
      Math.min(34, Math.max(28, availableWidth * 0.08)),
    );
    const titleLineHeight = Math.round(titleSize * 1.15);
    const subtitleSize = compact ? 15 : 16;
    const fieldHeight = Math.round(
      Math.min(54, Math.max(48, availableHeight * 0.062)),
    );
    const buttonHeight = Math.round(
      Math.min(54, Math.max(50, availableHeight * 0.064)),
    );
    const fieldGap = Math.round(
      Math.min(14, Math.max(10, availableHeight * 0.014)),
    );
    const sectionGap = Math.round(
      Math.min(28, Math.max(20, availableHeight * 0.028)),
    );
    const headerGap = Math.round(
      Math.min(18, Math.max(12, availableHeight * 0.018)),
    );
    const logoToTitleGap = Math.round(
      Math.min(28, Math.max(18, availableHeight * 0.028)),
    );
    const titleToFormGap = Math.round(
      Math.min(36, Math.max(24, availableHeight * 0.036)),
    );
    const footerGap = Math.round(
      Math.min(20, Math.max(14, availableHeight * 0.02)),
    );
    const bottomPad = Math.max(insets.bottom > 0 ? 8 : 16, footerGap);
    const topPad = Math.round(Math.min(12, Math.max(4, availableHeight * 0.008)));
    const radius = 14;
    const inputRadius = 12;

    return {
      contentMaxWidth: CONTENT_MAX_WIDTH,
      horizontalPadding,
      logoSize,
      titleSize,
      titleLineHeight,
      subtitleSize,
      fieldHeight,
      buttonHeight,
      fieldGap,
      sectionGap,
      headerGap,
      logoToTitleGap,
      titleToFormGap,
      footerGap,
      bottomPad,
      topPad,
      radius,
      inputRadius,
      compact,
      scrollable,
      topInset: insets.top,
      bottomInset: insets.bottom,
    };
  }, [
    screenWidth,
    screenHeight,
    insets.top,
    insets.bottom,
    insets.left,
    insets.right,
    scrollable,
  ]);
}
