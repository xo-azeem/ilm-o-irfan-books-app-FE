import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  ReduceMotion,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppLogo } from '@/components/brand';
import { RadialGlow } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The splash.
 *
 * ── The one rule everything else bends around ───────────────────────────────
 * The OS has already drawn this screen. Android's launch window and iOS's
 * LaunchScreen.storyboard both paint the same #080B09, the same 460dp glow and
 * the same 128dp mark, before a line of JS is read. So frame one here must be
 * identical to what is already on the glass.
 *
 * That is a constraint on the *first frame*, not on the screen: everything is
 * choreographed to start from that resting state and move outward from it.
 *
 * ── Why there is no wordmark ────────────────────────────────────────────────
 * There was one, and it broke the rule twice over. A centred column holding the
 * mark *and* a name centres the lockup, which lifts the mark ~22pt above where
 * the launch screen just drew it — the logo visibly jumped on handover. And the
 * name is the one element with no counterpart in the native screen, so it could
 * only ever appear out of nothing, mid-animation.
 *
 * The mark is now the only content, and this component renders exactly once —
 * there is no state, so there is nothing that can reflow.
 *
 * ── Why there is no safe-area padding ───────────────────────────────────────
 * Both launch screens centre the mark in the *window*. Padding the root by the
 * insets would centre it in the content box instead, pushing it down by half
 * the difference between the top and bottom insets — on a phone with a cutout
 * that is a visible drop. Nothing here is close enough to an edge to need the
 * insets, so the screen takes the full window and the mark lands where the OS
 * already drew it.
 */

// ── Beat 1: the mark wakes ──────────────────────────────────────────────────
/** A breath of a pause, so the handover frame is seen before anything moves. */
const WAKE_DELAY_MS = 70;
const MARK_RISE_MS = 260;
const MARK_SETTLE_MS = 340;
/** How far past its resting size the mark swells on the way up. */
const MARK_PEAK = 1.075;

// ── Beat 1b: light leaves the mark ──────────────────────────────────────────
/** A single ring of light leaving the mark. Runs once, on arrival only. */
const RING_MS = 940;
const RING_TO_SCALE = 2.15;

// ── Beat 2: waiting ─────────────────────────────────────────────────────────
/**
 * One slow breath of the glow. Loops until the session resolves.
 *
 * The breath runs 1 → 0 → 1, not 0 → 1: 1 is the glow's *resting* state, which
 * is what the native launch screen has already been showing. Starting anywhere
 * below that would dim the glow the instant JS took over.
 */
const PULSE_MS = 1500;
const PULSE_REST = 1;
/** The mark drifts a few points as it waits, so the screen is never quite still. */
const FLOAT_MS = 2400;
const FLOAT_PT = 4;

/**
 * How long the splash is guaranteed to hold, so the choreography above is
 * actually seen on a warm start where the session resolves immediately. The
 * ring lands at ~1050ms, which is what this is sized around.
 */
const MIN_VISIBLE_MS = 1150;
/** Give the navigator a beat to mount/paint under the splash before exit. */
const SETTLE_MS = 140;

// ── Beat 3: the exit ────────────────────────────────────────────────────────
// The Netflix exit is three things, and it falls flat without all of them: a
// short settle back before the push, a scale that *accelerates* rather than
// easing out, and a fade held off until the zoom is already reading. Fading
// from the first frame is what makes a zoom-out look like a plain cross-fade.
const EXIT_MS = 540;
const EXIT_SCALE = 1.24;
/** The wind-up: the mark eases back a hair before it is pushed forward. */
const EXIT_DIP_SCALE = 0.985;
const EXIT_DIP_MS = 120;
/** Home is already painted underneath, so the fade only covers the last half. */
const EXIT_FADE_DELAY_MS = 200;
const EXIT_FADE_MS = EXIT_MS - EXIT_FADE_DELAY_MS;

/**
 * Fixed, not responsive, and identical to the launch screens: the Android
 * `splash_logo` drawables at 128dp and the storyboard's 128pt image view.
 */
const SPLASH_LOGO_PT = 128;
/** Matches the 460dp glow layer in both launch screens. */
const SPLASH_GLOW_PT = 460;

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
/** Slow off the mark, accelerating away — the curve that reads as "into". */
const EASE_IN = Easing.bezier(0.5, 0, 0.75, 0);
const TIMING = { reduceMotion: ReduceMotion.System } as const;

type AuthSplashProps = {
  ready?: boolean;
  onFinished?: () => void;
};

export function AuthSplash({ ready = false, onFinished }: AuthSplashProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  // Every value starts at the state the native launch screen is already in, so
  // the first rendered frame is indistinguishable from the one before it.
  const markScale = useSharedValue(1);
  const markY = useSharedValue(0);
  const ring = useSharedValue(0);
  const pulse = useSharedValue(PULSE_REST);

  // Exit only.
  const exitScale = useSharedValue(1);
  const overlayOpacity = useSharedValue(1);

  const mountedAt = useRef(Date.now());
  const onFinishedRef = useRef(onFinished);
  const exiting = useRef(false);

  onFinishedRef.current = onFinished;

  const finish = useCallback(() => {
    onFinishedRef.current?.();
  }, []);

  // ── The arrival ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    // The mark swells past its resting size and settles back. It begins at 1,
    // which is where the OS left it, so this reads as the logo drawing breath
    // rather than as a second logo appearing on top of the first.
    markScale.value = withDelay(
      WAKE_DELAY_MS,
      withSequence(
        withTiming(MARK_PEAK, {
          duration: MARK_RISE_MS,
          easing: Easing.out(Easing.cubic),
          ...TIMING,
        }),
        withTiming(1, {
          duration: MARK_SETTLE_MS,
          easing: Easing.inOut(Easing.quad),
          ...TIMING,
        }),
      ),
    );

    // The glow is deliberately absent from this beat. It is already lit — the
    // native launch screen has been showing it for the whole bundle load — so
    // blooming it here would mean dimming it first. Only the ring is new.
    ring.value = withDelay(
      WAKE_DELAY_MS + 40,
      withTiming(1, { duration: RING_MS, easing: Easing.out(Easing.cubic), ...TIMING }),
    );

    return () => {
      cancelAnimation(markScale);
      cancelAnimation(ring);
    };
  }, [markScale, reduceMotion, ring]);

  // ── The wait ──────────────────────────────────────────────────────────────
  // Split from the arrival so the loops start after it, and can be cancelled on
  // exit without touching the one-shot animations above.
  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const idleAt = WAKE_DELAY_MS + MARK_RISE_MS + MARK_SETTLE_MS;

    // A slow breath of light, and a few points of drift on the mark. Together
    // they say "working" without a spinner, and cost two transforms a frame.
    pulse.value = withDelay(
      idleAt,
      withRepeat(
        withTiming(0, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad), ...TIMING }),
        -1,
        true,
      ),
    );

    markY.value = withDelay(
      idleAt,
      withRepeat(
        withTiming(-FLOAT_PT, {
          duration: FLOAT_MS,
          easing: Easing.inOut(Easing.quad),
          ...TIMING,
        }),
        -1,
        true,
      ),
    );

    return () => {
      cancelAnimation(pulse);
      cancelAnimation(markY);
    };
  }, [markY, pulse, reduceMotion]);

  // ── The exit ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || exiting.current) {
      return;
    }

    const playExit = () => {
      if (exiting.current) {
        return;
      }
      exiting.current = true;

      if (reduceMotion) {
        finish();
        return;
      }

      // Settle the idle loops into the exit rather than letting them run
      // underneath it — a breath fighting a zoom reads as a stutter.
      cancelAnimation(pulse);
      cancelAnimation(markY);
      pulse.value = withTiming(PULSE_REST, {
        duration: EXIT_DIP_MS,
        easing: EASE_OUT,
        ...TIMING,
      });
      markY.value = withTiming(0, { duration: EXIT_DIP_MS, easing: EASE_OUT, ...TIMING });

      // Ease back, then accelerate through the viewer.
      exitScale.value = withSequence(
        withTiming(EXIT_DIP_SCALE, {
          duration: EXIT_DIP_MS,
          easing: Easing.out(Easing.quad),
          ...TIMING,
        }),
        withTiming(EXIT_SCALE, {
          duration: EXIT_MS - EXIT_DIP_MS,
          easing: EASE_IN,
          ...TIMING,
        }),
      );

      overlayOpacity.value = withDelay(
        EXIT_FADE_DELAY_MS,
        withTiming(
          0,
          { duration: EXIT_FADE_MS, easing: Easing.in(Easing.quad), ...TIMING },
          finished => {
            if (finished) {
              runOnJS(finish)();
            }
          },
        ),
      );
    };

    const wait = Math.max(
      SETTLE_MS,
      MIN_VISIBLE_MS - (Date.now() - mountedAt.current),
    );
    const timer = setTimeout(playExit, wait);
    // If the exit's completion callback never fires — an interrupted animation,
    // a backgrounded app — the splash still hands over rather than sticking.
    const fallbackTimer = setTimeout(finish, wait + EXIT_MS + 80);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      cancelAnimation(overlayOpacity);
    };
  }, [exitScale, finish, markY, overlayOpacity, pulse, ready, reduceMotion]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // The wake and the exit are separate concerns that land on the same element,
  // so their scales are multiplied rather than nested in another view.
  const markStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: markY.value },
      { scale: markScale.value * exitScale.value },
    ],
  }));

  // Anchored so pulse = PULSE_REST is exactly 1.0 opacity and 1.0 scale —
  // pixel-for-pixel the glow the launch screen already drew. The cycle can only
  // take it *below* that, never above, so there is nothing to match on arrival.
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.88 + pulse.value * 0.12,
    transform: [{ scale: 0.95 + pulse.value * 0.05 }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    // Ignites from nothing and dissipates as it widens. It has to reach zero at
    // both ends: a ring already at rest on frame one would be a circle the
    // native launch screen never drew, which is the one thing this screen must
    // not do.
    opacity: interpolate(ring.value, [0, 0.1, 1], [0, 0.5, 0], Extrapolation.CLAMP),
    transform: [{ scale: 0.55 + ring.value * (RING_TO_SCALE - 0.55) }],
  }));

  return (
    <Animated.View
      pointerEvents="auto"
      style={[styles.root, overlayStyle, { backgroundColor: colors.background }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Ilm o Irfan"
      accessibilityState={{ busy: !ready }}>
      <Animated.View pointerEvents="none" style={[styles.centreLayer, glowStyle]}>
        <RadialGlow
          color={colors.primary}
          opacity={0.3}
          size={SPLASH_GLOW_PT}
          style={styles.glow}
        />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.centreLayer, ringStyle]}>
        <View style={[styles.ring, { borderColor: colors.primarySoft }]} />
      </Animated.View>

      <Animated.View collapsable={false} style={markStyle}>
        <AppLogo size={SPLASH_LOGO_PT} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    // Full window, no inset padding — see the note at the top of the file.
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centreLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    // The layer above owns the positioning, so the glow itself sits in flow.
    position: 'relative',
  },
  ring: {
    width: SPLASH_LOGO_PT,
    height: SPLASH_LOGO_PT,
    borderRadius: SPLASH_LOGO_PT / 2,
    borderWidth: 1.5,
  },
});
