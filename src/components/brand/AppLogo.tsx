import { Image, type StyleProp, type ImageStyle } from 'react-native';

import { APP_LOGO_SIZE, appLogo } from '@/constants/images';

type AppLogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function AppLogo({ size = APP_LOGO_SIZE, style }: AppLogoProps) {
  return (
    <Image
      source={appLogo}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      fadeDuration={0}
      accessibilityIgnoresInvertColors
    />
  );
}
