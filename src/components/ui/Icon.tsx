import { memo, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { radius } from '@/theme/palette';
import { useTheme, type AppColors } from '@/theme/ThemeContext';

export type { LucideIcon };

export type IconTone =
  | 'ink'
  | 'soft'
  | 'muted'
  | 'faint'
  | 'dim'
  | 'primary'
  | 'gold'
  | 'danger'
  | 'warning'
  | 'lime'
  | 'onPrimary';

function iconColor(tone: IconTone, colors: AppColors): string {
  switch (tone) {
    case 'ink':
      return colors.ink;
    case 'soft':
      return colors.inkSoft;
    case 'muted':
      return colors.muted;
    case 'faint':
      return colors.faint;
    case 'dim':
      return colors.dim;
    case 'primary':
      return colors.primarySoft;
    case 'gold':
      return colors.goldBright;
    case 'danger':
      return colors.danger;
    case 'warning':
      return colors.warning;
    case 'lime':
      return colors.lime;
    case 'onPrimary':
      return colors.onPrimary;
  }
}

export type IconProps = {
  icon: LucideIcon;
  size?: number;
  tone?: IconTone;
  /** Overrides `tone` when a one-off colour is genuinely needed. */
  color?: string;
  strokeWidth?: number;
};

/**
 * One wrapper so stroke weight and colour stay consistent everywhere. The
 * design draws icons at 1.7–1.8 stroke; anything heavier reads as a different
 * icon set.
 */
export const Icon = memo(function Icon({
  icon: Glyph,
  size = 18,
  tone = 'soft',
  color,
  strokeWidth = 1.8,
}: IconProps) {
  const { colors } = useTheme();
  return (
    <Glyph
      size={size}
      color={color ?? iconColor(tone, colors)}
      strokeWidth={strokeWidth}
    />
  );
});

export type IconTileTone = 'primary' | 'gold' | 'lime' | 'neutral' | 'danger' | 'warning';

export type IconTileProps = IconProps & {
  /** The rounded, tinted square behind a settings-row icon. */
  tileTone?: IconTileTone;
  tileSize?: number;
  style?: StyleProp<ViewStyle>;
};

function tileFill(tone: IconTileTone, colors: AppColors): string {
  switch (tone) {
    case 'primary':
      return colors.primaryFill;
    case 'gold':
      return colors.goldFill;
    case 'lime':
      return colors.limeFill;
    case 'danger':
      return colors.dangerFill;
    case 'warning':
      return colors.warningFill;
    case 'neutral':
      return colors.primaryFillSoft;
  }
}

const tileToIcon: Record<IconTileTone, IconTone> = {
  primary: 'primary',
  gold: 'gold',
  lime: 'lime',
  neutral: 'soft',
  danger: 'danger',
  warning: 'warning',
};

/** The coloured icon square that leads a settings or catalog row. */
export const IconTile = memo(function IconTile({
  icon,
  size = 15,
  tileTone = 'primary',
  tileSize = 32,
  strokeWidth = 1.8,
  tone,
  color,
  style,
}: IconTileProps) {
  const { colors } = useTheme();

  const tileStyle = useMemo<ViewStyle>(
    () => ({
      width: tileSize,
      height: tileSize,
      borderRadius: Math.round(tileSize * 0.34),
      backgroundColor: tileFill(tileTone, colors),
    }),
    [colors, tileSize, tileTone],
  );

  return (
    <View style={[styles.tile, tileStyle, style]}>
      <Icon
        icon={icon}
        size={size}
        tone={tone ?? tileToIcon[tileTone]}
        color={color}
        strokeWidth={strokeWidth}
      />
    </View>
  );
});

/**
 * A bordered, translucent square used for standalone controls — the back
 * button, the bell, the reader's chrome buttons.
 */
export const IconFrame = memo(function IconFrame({
  icon,
  size = 16,
  tone = 'soft',
  frameSize = 38,
  filled = false,
  style,
}: IconProps & {
  frameSize?: number;
  /** Filled frames sit over artwork; unfilled ones sit on a plain surface. */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  const frameStyle = useMemo<ViewStyle>(
    () => ({
      width: frameSize,
      height: frameSize,
      borderRadius: Math.round(frameSize * 0.32),
      backgroundColor: filled ? colors.scrim : colors.primaryFillSoft,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: colors.borderStrong,
    }),
    [colors, filled, frameSize],
  );

  return (
    <View style={[styles.tile, frameStyle, style]}>
      <Icon icon={icon} size={size} tone={tone} />
    </View>
  );
});

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export { radius };
