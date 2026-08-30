import { memo } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';

import { LinearGradient } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The "dynamic background" behind a book's hero.
 *
 * The whole feature is one image, scaled up and blurred, so any cover colour
 * sets the mood without a colour-extraction pass. Books with no artwork fall
 * back to their assigned cover colour, which produces the same effect for free.
 */
export const CoverBackdrop = memo(function CoverBackdrop({
  coverUrl,
  coverColor,
  height = 470,
}: {
  coverUrl?: string | null;
  coverColor?: string | null;
  height?: number;
}) {
  const { colors } = useTheme();
  const tint = coverColor ?? colors.coverBase;

  return (
    <View pointerEvents="none" style={[styles.root, { height }]}>
      {coverUrl ? (
        <>
          <Image
            source={{ uri: coverUrl }}
            style={styles.image}
            resizeMode="cover"
            blurRadius={Platform.OS === 'android' ? 25 : 0}
            accessibilityIgnoresInvertColors
          />
          {/* iOS gets the real blur; Android uses Image's own cheaper blurRadius. */}
          {Platform.OS === 'ios' ? (
            <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={26} />
          ) : null}
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      )}

      {/* Sinks the artwork into the page so the cover and title stay legible. */}
      <LinearGradient
        stops={[
          { offset: 0, color: colors.background, opacity: 0.35 },
          { offset: 0.58, color: colors.background, opacity: 0.75 },
          { offset: 1, color: colors.background, opacity: 1 },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFill,
    // Scaled past the frame so the blur has no visible edge.
    transform: [{ scale: 1.2 }],
    opacity: 0.85,
  },
});
