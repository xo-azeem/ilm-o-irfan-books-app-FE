import { memo, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Bookmark } from 'lucide-react-native';

import { AnimatedCheck } from '@/components/ui/AnimatedCheck';
import { Icon, type LucideIcon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { fontSize, scaleFont } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Where a save is, as far as the button is concerned.
 *
 * `done` is the beat right after a save lands: the tick draws itself. It is
 * only ever reached *from* `saving`, so a button that mounts already saved
 * shows a still tick rather than performing one.
 */
export type SavePhase = 'idle' | 'saving' | 'done';

const SWAP_MS = 140;

/** How long a compact tick stays before the glyph returns. */
const TICK_HOLD_MS = 1100;

/**
 * Follows `saving` and `saved` into a phase. With `holdMs`, `done` is a visit
 * rather than a resting state — the tick holds that long, then hands back to
 * the glyph, for buttons whose glyph *is* the state.
 */
export function useSavePhase(
  saving: boolean,
  saved: boolean,
  holdMs?: number,
): SavePhase {
  const [phase, setPhase] = useState<SavePhase>(saving ? 'saving' : 'idle');

  useEffect(() => {
    if (saving) {
      setPhase('saving');
      return;
    }
    setPhase(prev => (prev === 'saving' && saved ? 'done' : 'idle'));
  }, [saved, saving]);

  useEffect(() => {
    if (phase !== 'done' || holdMs == null) {
      return undefined;
    }
    const timer = setTimeout(() => setPhase('idle'), holdMs);
    return () => clearTimeout(timer);
  }, [holdMs, phase]);

  return phase;
}

/**
 * The glyph a save button carries: the icon at rest, a spinner while the save
 * is away, and the tick drawing itself as it lands. Each state fades over the
 * last, and all three sit on the same footprint so nothing around them moves.
 */
export const SaveGlyph = memo(function SaveGlyph({
  icon = Bookmark,
  phase,
  saved,
  size = 16,
  color,
  style,
}: {
  icon?: LucideIcon;
  phase: SavePhase;
  saved: boolean;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  const box = { width: size + 4, height: size + 4 };

  return (
    <View style={[box, style]}>
      {phase === 'saving' ? (
        <Animated.View
          key="saving"
          entering={FadeIn.duration(SWAP_MS)}
          exiting={FadeOut.duration(SWAP_MS)}
          style={styles.glyph}
        >
          <ActivityIndicator size="small" color={color} />
        </Animated.View>
      ) : phase === 'done' ? (
        <Animated.View
          key="done"
          entering={FadeIn.duration(SWAP_MS)}
          exiting={FadeOut.duration(SWAP_MS)}
          style={styles.glyph}
        >
          <AnimatedCheck size={size + 2} color={color} animate />
        </Animated.View>
      ) : (
        <Animated.View
          key="idle"
          entering={FadeIn.duration(SWAP_MS)}
          exiting={FadeOut.duration(SWAP_MS)}
          style={styles.glyph}
        >
          <Icon
            icon={icon}
            size={size}
            color={color}
            fill={saved ? color : 'transparent'}
          />
        </Animated.View>
      )}
    </View>
  );
});

/** Matches `Button` at `size="md"`, which sits beside it. */
const PILL = { height: 48, padding: 18, text: fontSize.bodySmall, radius: 14 };

/**
 * The Save pill beside "Read now". Outlined while the book is not saved,
 * a soft green fill once it is; between the two it spins, and the tick
 * draws itself in the moment the save lands, then stays as the mark.
 */
export const SaveButton = memo(function SaveButton({
  saved,
  saving = false,
  style,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  saved: boolean;
  saving?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, fontScale } = useTheme();
  const phase = useSavePhase(saving, saved);
  const showSaved = saved && phase !== 'saving';

  const ink = showSaved ? colors.primarySoft : colors.inkSoft;

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      height: Math.round(PILL.height * Math.max(1, fontScale)),
      paddingHorizontal: PILL.padding,
      borderRadius: PILL.radius,
      backgroundColor: showSaved ? colors.primaryFillSoft : 'transparent',
      borderWidth: showSaved ? 0 : StyleSheet.hairlineWidth * 2,
      borderColor: colors.borderStrong,
    }),
    [colors, fontScale, showSaved],
  );

  const glyphSize = scaleFont(PILL.text, fontScale);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: phase === 'saving', selected: saved }}
      accessibilityLabel={saved ? 'Remove from library' : 'Save to library'}
      disabled={phase === 'saving'}
      style={({ pressed }) => [
        styles.pill,
        containerStyle,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {phase === 'saving' ? (
        <Animated.View
          key="saving"
          entering={FadeIn.duration(SWAP_MS)}
          exiting={FadeOut.duration(SWAP_MS)}
          style={styles.content}
        >
          <ActivityIndicator size="small" color={ink} />
          <Text
            size={PILL.text}
            leading={1}
            weight="500"
            tone="inherit"
            style={{ color: ink }}
          >
            Saving…
          </Text>
        </Animated.View>
      ) : showSaved ? (
        <Animated.View
          key="saved"
          entering={FadeIn.duration(SWAP_MS)}
          exiting={FadeOut.duration(SWAP_MS)}
          style={styles.content}
        >
          <AnimatedCheck
            size={glyphSize + 2}
            color={ink}
            animate={phase === 'done'}
          />
          <Text
            size={PILL.text}
            leading={1}
            weight="600"
            tone="inherit"
            style={{ color: ink }}
          >
            Saved
          </Text>
        </Animated.View>
      ) : (
        <Animated.View
          key="idle"
          entering={FadeIn.duration(SWAP_MS)}
          exiting={FadeOut.duration(SWAP_MS)}
          style={styles.content}
        >
          <Icon icon={Bookmark} size={glyphSize} color={ink} />
          <Text
            size={PILL.text}
            leading={1}
            weight="500"
            tone="inherit"
            style={{ color: ink }}
          >
            Save
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
});

/**
 * The compact form for a header or a tile. The glyph is the state, so the
 * tick only visits: it draws in as the save lands, holds a beat, and gives
 * the glyph back.
 */
export const SaveIconButton = memo(function SaveIconButton({
  icon = Bookmark,
  saved,
  saving = false,
  size = 16,
  buttonSize = 38,
  style,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  icon?: LucideIcon;
  saved: boolean;
  saving?: boolean;
  size?: number;
  buttonSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const phase = useSavePhase(saving, saved, TICK_HOLD_MS);
  const showSaved = saved && phase !== 'saving';

  const ink = showSaved ? colors.primarySoft : colors.inkSoft;

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      width: buttonSize,
      height: buttonSize,
      borderRadius: Math.round(buttonSize * 0.32),
      backgroundColor: colors.primaryFillSoft,
    }),
    [buttonSize, colors],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: phase === 'saving', selected: saved }}
      disabled={phase === 'saving'}
      style={({ pressed }) => [
        styles.square,
        containerStyle,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      <SaveGlyph
        icon={icon}
        phase={phase}
        saved={showSaved}
        size={size}
        color={ink}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
