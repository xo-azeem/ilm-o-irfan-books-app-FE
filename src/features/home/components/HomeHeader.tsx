import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Bell } from 'lucide-react-native';

import { Avatar, Display, IconButton, Text } from '@/components/ui';
import { useStrings, type Strings } from '@/i18n';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/** Splits the day the way a reader would describe it, not the way a clock does. */
export function greetingFor(s: Strings, date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) {
    return s.home.greeting.stillAwake;
  }
  if (hour < 12) {
    return s.home.greeting.morning;
  }
  if (hour < 17) {
    return s.home.greeting.afternoon;
  }
  return s.home.greeting.evening;
}

/**
 * The greeting, the notification bell and the avatar. The bell carries a gold
 * dot when something is waiting — the only gold on the Home screen besides the
 * trending rank numerals.
 */
export const HomeHeader = memo(function HomeHeader({
  name,
  avatarUrl,
  hasNotifications = false,
  onProfilePress,
  onNotificationsPress,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  hasNotifications?: boolean;
  onProfilePress?: () => void;
  onNotificationsPress?: () => void;
}) {
  const { colors } = useTheme();
  const s = useStrings();
  const fullName = name?.trim();

  return (
    <View style={styles.root}>
      <View style={styles.greeting}>
        <Text size={fontSize.caption} leading={1} tone="soft">
          {fullName
            ? s.home.greetingWithName(greetingFor(s), fullName)
            : greetingFor(s)}
        </Text>
        <Display size={22}>{s.home.readyForAnotherChapter}</Display>
      </View>

      <View style={styles.actions}>
        <View>
          <IconButton
            icon={Bell}
            onPress={onNotificationsPress}
            variant="plain"
            accessibilityLabel={s.home.notifications}
          />
          {hasNotifications ? (
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: colors.gold,
                  borderColor: colors.background,
                },
              ]}
            />
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={s.home.yourProfile}
          onPress={onProfilePress}
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}
        >
          <Avatar name={name} imageUrl={avatarUrl} size={38} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  greeting: {
    flex: 1,
    // Lets the greeting wrap instead of widening the row past the safe area.
    minWidth: 0,
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // The bell and the avatar keep their size whatever the greeting does.
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.75,
  },
  sticky: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});

/**
 * The rule that slides over the top of Home once the reader is past the hero.
 * Names the half of the page they have reached rather than repeating the
 * greeting, which is already scrolled away.
 */
export const HomeStickyHeader = memo(function HomeStickyHeader({
  title,
  note,
}: {
  title?: string;
  note?: string;
}) {
  const s = useStrings();
  return (
    <View style={styles.sticky}>
      <Display size="section">{title ?? s.home.discovery}</Display>
      <Text
        size={fontSize.captionSmall}
        leading={1}
        weight="500"
        tone="primary"
      >
        {note ?? s.home.personalised}
      </Text>
    </View>
  );
});
