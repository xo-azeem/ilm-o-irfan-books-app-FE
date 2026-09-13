import { memo, useCallback, useEffect, useId, useMemo } from 'react';
import {
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
} from 'lucide-react-native';
import { create } from 'zustand';

import { Button, type ButtonVariant } from '@/components/ui/Button';
import {
  IconTile,
  type IconTileTone,
  type LucideIcon,
} from '@/components/ui/Icon';
import { Display, Text } from '@/components/ui/Text';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The app's one popup.
 *
 * Every confirmation, error and notice — "Discard changes?", "Sign in failed",
 * "Saved" — comes through here rather than the platform's `Alert`, so a popup
 * is drawn in the app's own surface, type and green instead of whatever the OS
 * happens to ship. Call sites ask for one imperatively:
 *
 *   showDialog({
 *     title: 'Remove download?',
 *     message: 'The book stays in your library.',
 *     actions: [
 *       { label: 'Cancel', style: 'cancel' },
 *       { label: 'Remove', style: 'destructive', onPress: remove },
 *     ],
 *   });
 *
 * ── Why not React Native's `Modal` ───────────────────────────────────────────
 * Dialogs are asked for from inside sheets — the reader's settings sheet owns
 * the Download tile — and a `Sheet` is itself a `Modal`. On iOS a second
 * `Modal` presented from a sibling subtree is refused outright ("already
 * presenting"), so the popup would never appear. Instead the dialog is drawn
 * by a `DialogLayer`: one sits at the app root, and every `Sheet` carries one
 * inside its own `Modal`. Whichever layer is topmost draws the request, so a
 * dialog always lands above whatever the reader is looking at, on both
 * platforms, with no native presentation involved.
 *
 * Requests queue. A dialog opened from another dialog's action ("Delete" →
 * "Request received") waits for the first to finish leaving, which is what the
 * platform alert does on iOS and what Android's replacing behaviour only
 * approximates.
 */

export type DialogActionStyle = 'default' | 'cancel' | 'destructive';

export type DialogAction = {
  label: string;
  onPress?: () => void;
  /**
   * `cancel` draws as the quiet outlined button and is the action a scrim tap
   * or the back button stands in for. `destructive` draws in the danger fill.
   */
  style?: DialogActionStyle;
};

/**
 * The colour the dialog leads with. Left unset, a dialog with a destructive
 * action reads as `danger`; anything else is `neutral` — title and message,
 * no icon.
 */
export type DialogTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type DialogOptions = {
  title: string;
  message?: string;
  /** Stacked full-width buttons. Defaults to a single "OK". */
  actions?: DialogAction[];
  tone?: DialogTone;
  /** Overrides the tone's default glyph in the header tile. */
  icon?: LucideIcon;
  /**
   * Whether a scrim tap or the back button closes the dialog (running the
   * cancel action, if there is one). Defaults to true.
   */
  dismissable?: boolean;
};

type DialogRequest = DialogOptions & { id: number };

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type DialogState = {
  /** Pending dialogs, oldest first. `queue[0]` is the one on screen. */
  queue: DialogRequest[];
  /** The id of `queue[0]` while it is animating out, else null. */
  closingId: number | null;
  /** Modal layers currently mounted, bottom to top. Empty means the root. */
  layers: string[];
};

const useDialogStore = create<DialogState>(() => ({
  queue: [],
  closingId: null,
  layers: [],
}));

let nextId = 1;

const EXIT_MS = 160;

const ENTER = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

const EXIT = {
  duration: EXIT_MS,
  easing: Easing.in(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** Opens a dialog. Safe to call from anywhere — a hook, a `.catch`, a store. */
export function showDialog(options: DialogOptions): void {
  // A dialog takes the screen; a keyboard left up behind it would cover the
  // buttons on a short phone.
  Keyboard.dismiss();
  const request: DialogRequest = { ...options, id: nextId++ };
  useDialogStore.setState(state => ({ queue: [...state.queue, request] }));
}

/**
 * Begins closing the dialog on screen. The layer drawing it plays the exit
 * animation and then calls `finishDialog`; the timer below is a backstop for
 * the case where that layer is unmounted mid-animation (a sheet that closed
 * under it), so the queue can never wedge.
 */
function closeDialog(id: number): void {
  useDialogStore.setState(state =>
    state.queue[0]?.id === id && state.closingId === null
      ? { closingId: id }
      : state,
  );
  setTimeout(() => finishDialog(id), EXIT_MS + 120);
}

function finishDialog(id: number): void {
  useDialogStore.setState(state =>
    state.queue[0]?.id === id
      ? { queue: state.queue.slice(1), closingId: null }
      : state,
  );
}

function pressAction(request: DialogRequest, action?: DialogAction): void {
  if (useDialogStore.getState().closingId === request.id) {
    return;
  }
  closeDialog(request.id);
  action?.onPress?.();
}

/**
 * Closes the dialog on screen the way a scrim tap would, running its cancel
 * action. Returns whether a dialog was there to take the press — the `Sheet`
 * routes Android's back button through this first, since inside a `Modal` the
 * hardware key reaches only `onRequestClose`, never `BackHandler`.
 */
export function dismissDialog(): boolean {
  const { queue, closingId } = useDialogStore.getState();
  const head = queue[0];
  if (!head) {
    return false;
  }
  if (closingId === head.id || head.dismissable === false) {
    return true;
  }
  pressAction(
    head,
    head.actions?.find(action => action.style === 'cancel'),
  );
  return true;
}

function registerLayer(id: string): void {
  useDialogStore.setState(state => ({ layers: [...state.layers, id] }));
}

function unregisterLayer(id: string): void {
  useDialogStore.setState(state => ({
    layers: state.layers.filter(layer => layer !== id),
  }));
}

// ---------------------------------------------------------------------------
// Layer
// ---------------------------------------------------------------------------

/**
 * Draws the dialog at the front of the queue, if this is the topmost layer.
 * Mounted once at the app root (`root`) and once inside every `Sheet`.
 */
export const DialogLayer = memo(function DialogLayer({
  root = false,
}: {
  root?: boolean;
}) {
  const id = useId();

  useEffect(() => {
    if (root) {
      return;
    }
    registerLayer(id);
    return () => unregisterLayer(id);
  }, [id, root]);

  const isTop = useDialogStore(state =>
    root
      ? state.layers.length === 0
      : state.layers[state.layers.length - 1] === id,
  );
  const head = useDialogStore(state => state.queue[0]);
  const closing = useDialogStore(
    state => state.closingId !== null && state.closingId === state.queue[0]?.id,
  );

  // Android's back button. Only the root layer ever receives it — see
  // `dismissDialog` for how a sheet forwards its own.
  useEffect(() => {
    if (!isTop || !head) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        dismissDialog();
        return true;
      },
    );
    return () => subscription.remove();
  }, [head, isTop]);

  if (!isTop || !head) {
    return null;
  }

  // Keyed by id so each request enters fresh rather than morphing the last.
  return <DialogCard key={head.id} request={head} closing={closing} />;
});

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

const toneGlyph: Record<
  Exclude<DialogTone, 'neutral'>,
  { tile: IconTileTone; icon: LucideIcon }
> = {
  info: { tile: 'primary', icon: Info },
  success: { tile: 'primary', icon: CircleCheck },
  warning: { tile: 'warning', icon: TriangleAlert },
  danger: { tile: 'danger', icon: CircleAlert },
};

const actionVariant: Record<DialogActionStyle, ButtonVariant> = {
  default: 'primary',
  cancel: 'secondary',
  destructive: 'dangerSolid',
};

const DEFAULT_ACTIONS: DialogAction[] = [{ label: 'OK' }];

const DialogCard = memo(function DialogCard({
  request,
  closing,
}: {
  request: DialogRequest;
  closing: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const { title, message, icon, tone, dismissable = true } = request;

  const finish = useCallback(() => finishDialog(request.id), [request.id]);

  useEffect(() => {
    progress.value = withTiming(1, ENTER);
  }, [progress]);

  useEffect(() => {
    if (!closing) {
      return;
    }
    progress.value = withTiming(0, EXIT, finished => {
      if (finished) {
        runOnJS(finish)();
      }
    });
  }, [closing, finish, progress]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const cardStyle = useAnimatedStyle(() => ({
    // Settles in from slightly small and low; the scrim fades over the same window.
    opacity: progress.value,
    transform: [
      { scale: 0.94 + 0.06 * progress.value },
      { translateY: (1 - progress.value) * 12 },
    ],
  }));

  // Cancel sits at the foot whatever order the caller gave, so the reader's
  // thumb finds "keep things as they are" in the same place every time.
  const actions = useMemo(() => {
    const list = request.actions?.length ? request.actions : DEFAULT_ACTIONS;
    return [
      ...list.filter(action => action.style !== 'cancel'),
      ...list.filter(action => action.style === 'cancel'),
    ];
  }, [request.actions]);

  const resolvedTone: DialogTone =
    tone ??
    (actions.some(action => action.style === 'destructive')
      ? 'danger'
      : 'neutral');

  const glyph =
    resolvedTone === 'neutral'
      ? icon
        ? { tile: 'neutral' as const, icon }
        : null
      : {
          tile: toneGlyph[resolvedTone].tile,
          icon: icon ?? toneGlyph[resolvedTone].icon,
        };

  const dismiss = useCallback(() => {
    dismissDialog();
  }, []);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
      accessibilityViewIsModal
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.scrim },
          scrimStyle,
        ]}
      >
        {dismissable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={StyleSheet.absoluteFill}
            onPress={dismiss}
          />
        ) : null}
      </Animated.View>

      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderStrong,
          },
          cardStyle,
        ]}
      >
        <View style={styles.header}>
          {glyph ? (
            <IconTile
              icon={glyph.icon}
              tileTone={glyph.tile}
              tileSize={46}
              size={21}
              strokeWidth={2}
            />
          ) : null}
          <View style={styles.copy}>
            <Display size={22} accessibilityRole="header">
              {title}
            </Display>
            {message ? (
              <Text tone="muted" size={fontSize.bodySmall} leading={1.5}>
                {message}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          {actions.map((action, index) => (
            <Button
              key={`${index}-${action.label}`}
              label={action.label}
              size="md"
              variant={actionVariant[action.style ?? 'default']}
              onPress={() => pressAction(request, action)}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 1000,
    elevation: 1000,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.hero,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 22,
    gap: 22,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 18 },
    elevation: 24,
  },
  header: {
    gap: 16,
  },
  copy: {
    gap: 8,
  },
  actions: {
    gap: 10,
  },
});
