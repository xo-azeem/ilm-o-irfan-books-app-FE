import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONTENT_MAX_WIDTH = 360;

export function useAuthLayoutMetrics(scrollable: boolean) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const availableHeight = screenHeight - insets.top - insets.bottom;

    const logoSize = Math.round(Math.min(80, Math.max(62, availableHeight * 0.095)));
    const horizontalPadding = Math.max(20, Math.round(screenWidth * 0.06));
    const fieldGap = Math.round(Math.min(18, Math.max(14, availableHeight * 0.019)));
    const blockGap = Math.round(Math.min(22, Math.max(16, availableHeight * 0.024)));
    const headerToFormGap = Math.round(Math.min(28, Math.max(18, availableHeight * 0.026)));
    const footerGap = Math.round(Math.min(20, Math.max(12, availableHeight * 0.018)));
    const titleSubtitleGap = 10;
    const logoToTitleGap = Math.round(Math.min(22, Math.max(14, availableHeight * 0.02)));
    const actionGap = Math.round(Math.min(16, Math.max(12, availableHeight * 0.016)));

    return {
      contentMaxWidth: CONTENT_MAX_WIDTH,
      logoSize,
      horizontalPadding,
      fieldGap,
      blockGap,
      headerToFormGap,
      footerGap,
      titleSubtitleGap,
      logoToTitleGap,
      actionGap,
      compact: !scrollable && availableHeight < 700,
    };
  }, [screenWidth, screenHeight, insets.top, insets.bottom, scrollable]);
}
