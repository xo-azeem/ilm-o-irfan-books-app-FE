import { memo, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  SlideInUp,
  SlideOutUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BadgeCheck,
  BookOpen,
  Library,
  ShieldAlert,
  Sparkles,
  X,
  type LucideIcon as LucideGlyph,
} from 'lucide-react-native';
import { create } from 'zustand';

import { Icon, IconTile, type IconTileTone } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import type { PushIntent, PushKind } from '@/services/push/payload';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';
import { useStrings } from '@/i18n';

/**
 * A push notification, drawn inside the app.
 *
 * The OS only draws a notification when the app is in the background; one
 * that arrives while the reader is looking at the app would otherwise vanish
 * into the tray unseen. So the same title and body slide in at the top for
 * a few seconds, in the app's own surface. A tap goes where the tray tap
 * would; the cross, a second push, or the timer takes it away.
 *
 * One banner at a time — a burst of pushes is a burst, and the tray already
 * has them all. Mounted once by `AppShell`, above the navigator and beneath
 * the dialog layer.
 */

export type PushBannerRequest = {
  title: string;
  body: string | null;
  kind: PushKind | null;
  intent: PushIntent | null;
  onOpen: (intent: PushIntent | null) => void;
};

type BannerState = {
  current: (PushBannerRequest & { id: number }) | null;
};

const useBannerStore = create<BannerState>(() => ({ current: null }));

let nextId = 1;

const HOLD_MS = 6000;

const ENTER = SlideInUp.duration(320)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

const EXIT = SlideOutUp.duration(220)
  .easing(Easing.in(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

/** Shows a banner, replacing whichever is up. Safe from any context. */
export function showPushBanner(request: PushBannerRequest): void {
  useBannerStore.setState({ current: { ...request, id: nextId++ } });
}

function dismissBanner(id: number): void {
  useBannerStore.setState(state =>
    state.current?.id === id ? { current: null } : state,
  );
}

const glyphFor: Record<PushKind, { icon: LucideGlyph; tone: IconTileTone }> = {
  books_published: { icon: Sparkles, tone: 'primary' },
  collection_published: { icon: Sparkles, tone: 'primary' },
  collection_books_added: { icon: Sparkles, tone: 'primary' },
  book_deleted: { icon: Library, tone: 'warning' },
  book_file_replaced: { icon: BookOpen, tone: 'primary' },
  book_updated: { icon: BookOpen, tone: 'primary' },
  membership_activated: { icon: BadgeCheck, tone: 'gold' },
  membership_expired: { icon: BadgeCheck, tone: 'warning' },
  account_deletion_approved: { icon: ShieldAlert, tone: 'danger' },
  account_deletion_rejected: { icon: ShieldAlert, tone: 'neutral' },
  account_deletion_requested: { icon: ShieldAlert, tone: 'warning' },
};

export const PushBannerLayer = memo(function PushBannerLayer() {
  const current = useBannerStore(state => state.current);

  if (!current) {
    return null;
  }

  // Keyed by id so a replacement slides in fresh rather than morphing.
  return <Banner key={current.id} request={current} />;
});

const Banner = memo(function Banner({
  request,
}: {
  request: PushBannerRequest & { id: number };
}) {
  const { colors } = useTheme();
  const s = useStrings();
  const insets = useSafeAreaInsets();
  const { id, title, body, kind, intent, onOpen } = request;

  useEffect(() => {
    const timer = setTimeout(() => dismissBanner(id), HOLD_MS);
    return () => clearTimeout(timer);
  }, [id]);

  const open = useCallback(() => {
    dismissBanner(id);
    onOpen(intent);
  }, [id, intent, onOpen]);

  const close = useCallback(() => dismissBanner(id), [id]);

  const glyph = kind ? glyphFor[kind] : glyphFor.books_published;

  return (
    <Animated.View
      entering={ENTER}
      exiting={EXIT}
      pointerEvents="box-none"
      style={[styles.layer, { paddingTop: insets.top + 8 }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${body ?? ''}`.trim()}
        onPress={open}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: pressed
              ? colors.surfaceRaised
              : colors.surfaceHigh,
            borderColor: colors.borderStrong,
            shadowColor: '#000',
          },
        ]}
      >
        <IconTile
          icon={glyph.icon}
          tileTone={glyph.tone}
          tileSize={36}
          size={17}
        />
        <View style={styles.body}>
          <Text
            size={fontSize.bodySmall}
            weight="500"
            leading={1.25}
            numberOfLines={2}
          >
            {title}
          </Text>
          {body ? (
            <Text
              size={fontSize.captionSmall + 0.5}
              leading={1.35}
              tone="muted"
              numberOfLines={2}
            >
              {body}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={s.push.dismiss}
          hitSlop={10}
          onPress={close}
          style={styles.close}
        >
          <Icon icon={X} size={15} color={colors.dim} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    zIndex: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  close: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
