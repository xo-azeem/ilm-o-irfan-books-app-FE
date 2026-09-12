import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Bookmark, Play } from 'lucide-react-native';

import {
  BookCover,
  Button,
  Display,
  IconButton,
  Label,
  RadialGlow,
  Text,
  UrduText,
} from '@/components/ui';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * One slide of the admin's carousel, ready to draw.
 *
 * Everything with a copy decision in it — the headline, the subtitle, the
 * badge, the button's label, the image and the accent — is the admin's, and
 * arrives already resolved against the book. The card renders what it is given
 * and hides what it is not.
 */
export type HeroSlide = {
  id: string;
  /** The book the slide opens. */
  bookId: string;
  headline: string;
  /** Absent when unset — the line is hidden, not drawn empty. */
  subtitle?: string;
  badge?: string;
  /** Absent when unset — the button falls back to its own default label. */
  ctaLabel?: string;
  accent?: string;
  imageUrl?: string;
  /** The book's own title, for the cover caption. */
  title: string;
  author?: string;
  rating?: number;
  /** The headline leads in Nastaliq rather than Latin. */
  isUrdu?: boolean;
};

/** The label the CTA carries when the admin has not written one. */
const DEFAULT_CTA = 'Read now';

/** The `md` Button's height and corner radius, which the save button mirrors. */
const ACTION_HEIGHT = 48;
const ACTION_RADIUS = 14;

/**
 * The slide at the top of Home. One book, given the room a bookshop gives its
 * window — cover, the admin's line about it, and a single way in.
 */
export const HeroSlideCard = memo(function HeroSlideCard({
  slide,
  saved = false,
  onRead,
  onSave,
  onPress,
}: {
  slide: HeroSlide;
  saved?: boolean;
  onRead?: (slide: HeroSlide) => void;
  onSave?: (slide: HeroSlide) => void;
  onPress?: (slide: HeroSlide) => void;
}) {
  const { colors, fontScale } = useTheme();

  // The save button sits beside a `md` Button, which grows its height with the
  // reader's font scale. Following the same ramp keeps the two the same size
  // rather than letting "Read now" outgrow its neighbour on a scaled-up device.
  const saveButtonSize = Math.round(ACTION_HEIGHT * Math.max(1, fontScale));

  const handleRead = useCallback(() => onRead?.(slide), [slide, onRead]);
  const handleSave = useCallback(() => onSave?.(slide), [slide, onSave]);
  const handlePress = useCallback(() => onPress?.(slide), [slide, onPress]);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
      ]}
    >
      {/* A static radial wash rather than a blur pass — free on Android. The
          accent is the admin's, falling back to the book's own cover colour
          server-side, so there is nothing left to resolve here. */}
      <RadialGlow
        color={slide.accent ?? colors.primary}
        opacity={0.36}
        size={340}
        left={-60}
        top={-120}
      />

      <View style={styles.top}>
        <BookCover
          width={112}
          coverUrl={slide.imageUrl}
          coverColor={slide.accent}
          rounded={10}
          elevated
          caption={`COVER · ${slide.title.toUpperCase()}`}
        />

        <View style={styles.headline}>
          {slide.badge ? (
            <Label size={10} weight="600" tracking={1.5} tone="gold">
              {slide.badge}
            </Label>
          ) : null}

          {slide.isUrdu ? (
            <UrduText size={24} numberOfLines={3} onPress={handlePress}>
              {slide.headline}
            </UrduText>
          ) : (
            <Display size="subheading" numberOfLines={3} onPress={handlePress}>
              {slide.headline}
            </Display>
          )}

          {slide.author ? (
            <Text
              size={fontSize.caption}
              leading={1.4}
              tone="muted"
              numberOfLines={2}
            >
              {slide.author}
            </Text>
          ) : null}

          {slide.rating != null ? (
            <View style={styles.rating}>
              <Text
                size={fontSize.caption}
                leading={1}
                weight="600"
                tone="gold"
              >
                {slide.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {slide.subtitle ? (
        <Text size={13.5} leading={1.6} tone="soft" numberOfLines={3}>
          {slide.subtitle}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={slide.ctaLabel ?? DEFAULT_CTA}
          icon={Play}
          size="md"
          onPress={handleRead}
          style={styles.readButton}
        />
        <IconButton
          icon={Bookmark}
          buttonSize={saveButtonSize}
          onPress={handleSave}
          accessibilityLabel={saved ? 'Remove from wishlist' : 'Save for later'}
          variant={saved ? 'ghost' : 'secondary'}
          style={styles.saveButton}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.hero,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 20,
    gap: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 12,
  },
  top: {
    flexDirection: 'row',
    gap: 16,
  },
  headline: {
    flex: 1,
    gap: 9,
    paddingTop: 4,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  readButton: {
    flex: 1,
  },
  saveButton: {
    borderRadius: ACTION_RADIUS,
  },
});
