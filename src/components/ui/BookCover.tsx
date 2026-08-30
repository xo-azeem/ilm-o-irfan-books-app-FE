import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import { CoverProgress } from '@/components/ui/Progress';
import { Display, Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeContext';

/** Covers keep a consistent 2:3 ratio wherever they appear. */
export const COVER_RATIO = 1.5;

export function coverHeight(width: number) {
  return Math.round(width * COVER_RATIO);
}

/**
 * The diagonal weave a book falls back to when it has no artwork. Drawn as a
 * single SVG pattern rather than a stack of rotated views, so a grid of twenty
 * covers is still twenty native views rather than two hundred.
 */
const CoverWeave = memo(function CoverWeave({
  base,
  stripe,
  stripeWidth = 6,
}: {
  base: string;
  stripe: string;
  stripeWidth?: number;
}) {
  const tile = stripeWidth * 2;

  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern
          id="weave"
          patternUnits="userSpaceOnUse"
          width={tile}
          height={tile}
          patternTransform="rotate(45)">
          <Rect width={tile} height={tile} fill={base} />
          <Line
            x1={stripeWidth / 2}
            y1={0}
            x2={stripeWidth / 2}
            y2={tile}
            stroke={stripe}
            strokeWidth={stripeWidth}
          />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#weave)" />
    </Svg>
  );
});

export type BookCoverProps = {
  width: number;
  /** Defaults to the 2:3 ratio; pass a value only for a deliberate crop. */
  height?: number;
  coverUrl?: string | null;
  /** Base colour for the fallback weave. Falls back to the brand green. */
  coverColor?: string | null;
  rounded?: number;
  /** 0–1. Draws the hairline along the bottom edge. */
  progress?: number;
  finished?: boolean;
  /** The gold rank numeral that half-overlaps a trending cover. */
  rank?: number;
  /** Rendered inside the cover, e.g. a "downloaded" tick. */
  overlay?: ReactNode;
  /** Renders a dashed outline instead — the empty-shelf and no-PDF states. */
  placeholder?: boolean;
  placeholderLabel?: string;
  /** Small mono caption printed at the foot of a large fallback cover. */
  caption?: string;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Every cover in the app — grids, rails, hero cards, admin rows — is this one
 * component, so the ratio, radius, fallback and progress hairline can never
 * drift between screens.
 */
export const BookCover = memo(function BookCover({
  width,
  height,
  coverUrl,
  coverColor,
  rounded,
  progress,
  finished = false,
  rank,
  overlay,
  placeholder = false,
  placeholderLabel,
  caption,
  elevated = false,
  style,
}: BookCoverProps) {
  const { colors } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [coverUrl]);

  const h = height ?? coverHeight(width);
  // Radius scales with the cover so a 40px admin thumbnail and a 158px hero
  // cover read as the same object at different sizes.
  const r = rounded ?? Math.max(5, Math.round(width * 0.07));
  const showImage = !!coverUrl && !imageFailed && !placeholder;

  const base = coverColor ?? colors.coverBase;
  const stripe = useMemo(() => (coverColor ? shade(coverColor, -0.22) : colors.coverStripe), [colors.coverStripe, coverColor]);

  const frameStyle = useMemo<ViewStyle>(
    () => ({
      width,
      height: h,
      borderRadius: r,
      backgroundColor: placeholder ? 'transparent' : base,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: placeholder ? colors.borderStrong : colors.border,
      borderStyle: placeholder ? 'dashed' : 'solid',
      ...(elevated
        ? {
            shadowColor: '#000',
            shadowOpacity: 0.55,
            shadowRadius: 26,
            shadowOffset: { width: 0, height: 14 },
            elevation: 12,
          }
        : null),
    }),
    [base, colors, elevated, h, placeholder, r, width],
  );

  return (
    <View style={[styles.wrap, rank != null && styles.rankWrap, style]}>
      <View style={[styles.frame, frameStyle]}>
        {placeholder ? null : showImage ? (
          <Image
            source={{ uri: coverUrl! }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            onError={() => setImageFailed(true)}
          />
        ) : (
          <CoverWeave base={base} stripe={stripe} stripeWidth={width > 90 ? 6 : 5} />
        )}

        {placeholderLabel ? (
          <View style={styles.centered}>
            <Text size={9} leading={1.2} align="center" tone="warning">
              {placeholderLabel}
            </Text>
          </View>
        ) : null}

        {caption && !showImage ? (
          <View style={styles.caption}>
            <Text size={8.5} leading={1.3} tone="faint" style={styles.captionText}>
              {caption}
            </Text>
          </View>
        ) : null}

        {overlay}

        {progress != null ? <CoverProgress value={progress} finished={finished} /> : null}
      </View>

      {rank != null ? (
        <Display size={46} weight="600" style={[styles.rank, { color: colors.gold }]}>
          {String(rank)}
        </Display>
      ) : null}
    </View>
  );
});

/**
 * Darkens or lightens a hex colour. Used to derive the weave's stripe from a
 * book's own cover colour so admin-chosen colours stay coherent.
 */
function shade(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) {
    return hex;
  }
  const num = parseInt(clean, 16);
  const adjust = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel + channel * amount)));

  const r = adjust((num >> 16) & 0xff);
  const g = adjust((num >> 8) & 0xff);
  const b = adjust(num & 0xff);

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export type AvatarProps = {
  /** Falls back to initials derived from `name`. */
  imageUrl?: string | null;
  name?: string | null;
  size?: number;
  /** Squircle for profile headers, circle for compact rows. */
  shape?: 'squircle' | 'circle';
  tone?: 'primary' | 'neutral' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function initialsFrom(name?: string | null): string {
  if (!name) {
    return '?';
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar = memo(function Avatar({
  imageUrl,
  name,
  size = 38,
  shape = 'circle',
  tone = 'primary',
  style,
}: AvatarProps) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  const palette = useMemo(() => {
    switch (tone) {
      case 'primary':
        return { fill: colors.primaryFill, ink: colors.primarySoft };
      case 'danger':
        return { fill: colors.dangerFill, ink: colors.danger };
      case 'neutral':
        return { fill: colors.primaryFillSoft, ink: colors.muted };
    }
  }, [colors, tone]);

  return (
    <View
      style={[
        styles.centered,
        {
          width: size,
          height: size,
          borderRadius: shape === 'circle' ? size / 2 : Math.round(size * 0.34),
          backgroundColor: palette.fill,
          overflow: 'hidden',
        },
        style,
      ]}>
      {imageUrl && !failed ? (
        <Image
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          onError={() => setFailed(true)}
        />
      ) : (
        <Text
          size={Math.round(size * 0.36)}
          leading={1}
          weight="600"
          tone="inherit"
          style={{ color: palette.ink }}>
          {initialsFrom(name)}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  rankWrap: {
    // Leaves room for the numeral that hangs off the cover's left edge.
    paddingLeft: 6,
  },
  frame: {
    overflow: 'hidden',
    position: 'relative',
  },
  centered: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    position: 'absolute',
    left: 9,
    right: 9,
    bottom: 9,
  },
  captionText: {
    opacity: 0.75,
  },
  rank: {
    position: 'absolute',
    left: -6,
    bottom: 8,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
  },
});
