import { memo, useCallback, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Chip, ChipWrap, Display, Icon, Text } from '@/components/ui';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/** The reading moods offered on Home. Ordered calmest-last, as an evening ramp. */
export const READING_MOODS = ['Reflective', 'Curious', 'Focused', 'Calm'] as const;

export type ReadingMood = (typeof READING_MOODS)[number];

/**
 * What each mood leans toward, matched against a book's genre. The catalog has
 * no mood column, so this is an editorial mapping onto the subjects we do
 * store — change it here and every rail that honours a mood follows.
 */
export const MOOD_SUBJECTS: Record<ReadingMood, string[]> = {
  Reflective: ['seerat', 'tasawwuf', 'spiritual', 'akhlaq', 'biography'],
  Curious: ['history', 'tafseer', 'science', 'philosophy', 'quran'],
  Focused: ['fiqh', 'hadith', 'usul', 'jurisprudence', 'law'],
  Calm: ['poetry', 'adab', 'dua', 'literature', 'children'],
};

/** A null mood matches everything, so clearing the choice restores the rail. */
export function matchesMood(genre: string | undefined | null, mood: ReadingMood | null): boolean {
  if (!mood) {
    return true;
  }
  if (!genre) {
    return false;
  }
  const subject = genre.toLowerCase();
  return MOOD_SUBJECTS[mood].some(term => subject.includes(term));
}

/**
 * What the app says back once a mood is picked. The point is that the reader
 * feels answered rather than merely recorded, so each line names the mood and
 * then has a little fun at their expense.
 */
export const MOOD_REPLIES: Record<ReadingMood, string> = {
  Reflective: 'Deep waters tonight. Go gently.',
  Curious: "Oh, so you're curious. That's how it starts.",
  Focused: 'Focused it is. Phone face-down, please.',
  Calm: 'Calm. Consider the tea poured.',
};

const MOTION = { reduceMotion: ReduceMotion.System } as const;

/*
 * The confirmation is three beats, played one after another in the same spot
 * rather than stacked — the tick is read, it leaves, and only then does the
 * reply take the space it was using. Every value below is a duration; the
 * absolute marks that follow are derived from them, so retiming a beat never
 * leaves a later one landing in the wrong place.
 */

// Beat one: the tick.
const TICK_IN_MS = 220;
const TICK_HOLD_MS = 620;
const TICK_OUT_MS = 260;
const TICK_END_MS = TICK_IN_MS + TICK_HOLD_MS + TICK_OUT_MS;

// Beat two: the reply. It starts a hair before the tick has finished clearing —
// a 70ms overlap reads as one handover rather than two separate events, where a
// hard cut leaves a visibly empty frame between them.
const REPLY_OVERLAP_MS = 70;
const REPLY_START_MS = TICK_END_MS - REPLY_OVERLAP_MS;
const REPLY_IN_MS = 280;
/** The line is on screen and fully legible for this long. */
const REPLY_HOLD_MS = 2000;
const REPLY_OUT_MS = 320;
const REPLY_END_MS = REPLY_START_MS + REPLY_IN_MS + REPLY_HOLD_MS + REPLY_OUT_MS;

// Beat three: the card folds away.
const COLLAPSE_MS = 340;

/**
 * The mood prompt.
 *
 * A question the reader answers once per session: picking a mood re-weights the
 * recommendation rail, plays a confirming tick, and then folds the card away so
 * Home is not left carrying a control that has already done its job.
 */
export const MoodPicker = memo(function MoodPicker({
  value,
  onChange,
  title = 'How are you reading tonight?',
  /** The parent's row gap, absorbed as the card collapses so nothing jumps. */
  gap = 26,
}: {
  value?: ReadingMood | null;
  onChange?: (mood: ReadingMood | null) => void;
  title?: string;
  gap?: number;
}) {
  const { colors } = useTheme();

  // Captured on first layout so the collapse has a real height to travel from.
  const [height, setHeight] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  // Held locally rather than read from `value`: the reply has to keep naming
  // the mood for the whole beat, even if the parent clears the selection.
  const [picked, setPicked] = useState<ReadingMood | null>(null);

  const collapse = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  // Five layers move independently: the ring pulses outward, the disc pops in,
  // the tick lands inside it a beat later, and the reply rises and swells into
  // the space all three leave behind.
  const ringProgress = useSharedValue(0);
  const discScale = useSharedValue(0.4);
  const discOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const replyOpacity = useSharedValue(0);
  const replyY = useSharedValue(14);
  const replyScale = useSharedValue(0.94);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    // Only the resting height matters; ignore the frames during the collapse.
    setHeight(current => (current == null ? next : current));
  }, []);

  const handleSelect = useCallback(
    (mood: ReadingMood) => {
      if (answered) {
        return;
      }

      // Re-weight the rails immediately — the animation is confirmation, not a
      // gate, so the page below has already updated by the time the tick fades.
      onChange?.(mood);
      setPicked(mood);
      setAnswered(true);

      // The ring runs once, outward and away, and never comes back. It spans
      // the tick's arrival and hold, so it has faded before the disc leaves.
      ringProgress.value = withTiming(1, {
        duration: TICK_IN_MS + TICK_HOLD_MS,
        easing: Easing.out(Easing.cubic),
        ...MOTION,
      });

      const discSettleMs = 150;

      discOpacity.value = withSequence(
        withTiming(1, { duration: 130, easing: Easing.out(Easing.quad), ...MOTION }),
        withDelay(
          TICK_IN_MS + TICK_HOLD_MS - 130,
          withTiming(0, { duration: TICK_OUT_MS, easing: Easing.in(Easing.quad), ...MOTION }),
        ),
      );

      // Overshoot in, settle, hold, then swell away as it fades — the shape of
      // Instagram's like tick, given room to actually be seen.
      discScale.value = withSequence(
        withTiming(1.14, {
          duration: TICK_IN_MS,
          easing: Easing.out(Easing.back(2.4)),
          ...MOTION,
        }),
        withTiming(1, { duration: discSettleMs, easing: Easing.out(Easing.quad), ...MOTION }),
        withDelay(
          TICK_HOLD_MS - discSettleMs,
          withTiming(1.35, {
            duration: TICK_OUT_MS,
            easing: Easing.in(Easing.quad),
            ...MOTION,
          }),
        ),
      );

      // The tick lands a beat after the disc, so it reads as being stamped into
      // it rather than painted on the same frame.
      iconOpacity.value = withDelay(100, withTiming(1, { duration: 100, ...MOTION }));
      iconScale.value = withDelay(
        100,
        withSequence(
          withTiming(1.3, {
            duration: 190,
            easing: Easing.out(Easing.back(3)),
            ...MOTION,
          }),
          withTiming(1, { duration: 160, easing: Easing.out(Easing.quad), ...MOTION }),
        ),
      );

      // The reply takes over the spot the tick just left: it rises and swells
      // in, holds still for two full seconds, then fades straight out.
      replyOpacity.value = withDelay(
        REPLY_START_MS,
        withSequence(
          withTiming(1, { duration: REPLY_IN_MS, easing: Easing.out(Easing.quad), ...MOTION }),
          withDelay(
            REPLY_HOLD_MS,
            withTiming(0, {
              duration: REPLY_OUT_MS,
              easing: Easing.in(Easing.quad),
              ...MOTION,
            }),
          ),
        ),
      );
      replyY.value = withDelay(
        REPLY_START_MS,
        withTiming(0, { duration: REPLY_IN_MS + 90, easing: Easing.out(Easing.cubic), ...MOTION }),
      );
      replyScale.value = withDelay(
        REPLY_START_MS,
        withTiming(1, { duration: REPLY_IN_MS + 90, easing: Easing.out(Easing.cubic), ...MOTION }),
      );

      contentOpacity.value = withTiming(0, {
        duration: TICK_IN_MS + 60,
        easing: Easing.out(Easing.quad),
        ...MOTION,
      });

      collapse.value = withDelay(
        REPLY_END_MS,
        withTiming(1, {
          duration: COLLAPSE_MS,
          easing: Easing.inOut(Easing.quad),
          ...MOTION,
        }),
      );
    },
    [
      answered,
      collapse,
      contentOpacity,
      discOpacity,
      discScale,
      iconOpacity,
      iconScale,
      onChange,
      replyOpacity,
      replyScale,
      replyY,
      ringProgress,
    ],
  );

  const containerStyle = useAnimatedStyle(() => {
    // Height stays automatic until there is something to collapse, so the card
    // reflows normally with the reader's text size.
    if (!answered || height == null) {
      return {};
    }
    return {
      height: interpolate(collapse.value, [0, 1], [height, 0]),
      marginBottom: interpolate(collapse.value, [0, 1], [0, -gap]),
      opacity: interpolate(collapse.value, [0, 0.65, 1], [1, 1, 0]),
    };
  }, [answered, gap, height]);

  const cardStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  const discStyle = useAnimatedStyle(() => ({
    opacity: discOpacity.value,
    transform: [{ scale: discScale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ringProgress.value, [0, 0.15, 1], [0, 0.5, 0]),
    transform: [{ scale: interpolate(ringProgress.value, [0, 1], [0.6, 1.9]) }],
  }));

  const replyStyle = useAnimatedStyle(() => ({
    opacity: replyOpacity.value,
    transform: [{ translateY: replyY.value }, { scale: replyScale.value }],
  }));

  return (
    <Animated.View style={[styles.root, containerStyle]} onLayout={handleLayout}>
      <View style={styles.card}>
        <Animated.View style={[styles.body, cardStyle]}>
          <Display size="section" align="center">
            {title}
          </Display>

          <ChipWrap gap={9} style={styles.chips}>
            {READING_MOODS.map(mood => (
              <MoodChip
                key={mood}
                mood={mood}
                selected={value === mood}
                onSelect={handleSelect}
              />
            ))}
          </ChipWrap>
        </Animated.View>

        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tickLayer]}>
          <View style={styles.tickStack}>
            <Animated.View
              style={[styles.ring, { borderColor: colors.primarySoft }, ringStyle]}
            />
            <Animated.View
              style={[styles.disc, { backgroundColor: colors.primary }, discStyle]}>
              <Animated.View style={iconStyle}>
                <Icon icon={Check} size={34} tone="onPrimary" strokeWidth={3} />
              </Animated.View>
            </Animated.View>
          </View>

          {picked ? (
            <Animated.View style={[styles.reply, replyStyle]}>
              <Display size="cardTitle" align="center" tone="primary">
                {picked}
              </Display>
              <Text size={fontSize.caption} leading={1.35} align="center" tone="muted">
                {MOOD_REPLIES[picked]}
              </Text>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
});

/** Split out so each chip keeps a stable handler across parent renders. */
const MoodChip = memo(function MoodChip({
  mood,
  selected,
  onSelect,
}: {
  mood: ReadingMood;
  selected: boolean;
  onSelect: (mood: ReadingMood) => void;
}) {
  const handlePress = useCallback(() => onSelect(mood), [mood, onSelect]);

  return <Chip label={mood} selected={selected} size="sm" onPress={handlePress} />;
});

const styles = StyleSheet.create({
  root: {
    // Deliberately not clipped: the ring expands past the card's bounds, and by
    // the time the height collapse starts every layer inside is already at zero
    // opacity, so there is nothing left to spill.
    alignItems: 'stretch',
  },
  card: {
    paddingVertical: 10,
  },
  body: {
    alignItems: 'center',
    gap: 14,
  },
  chips: {
    justifyContent: 'center',
  },
  tickLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The tick and the reply are never on screen together, so both sit absolutely
  // in the centre of the layer and take turns in the one spot. Keeping them out
  // of the flow is also what keeps the ring centred on the disc.
  tickStack: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reply: {
    position: 'absolute',
    // Full width, so a long line wraps inside the card instead of measuring
    // itself against the text and running past the edges.
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 1,
  },
  disc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
  },
});
