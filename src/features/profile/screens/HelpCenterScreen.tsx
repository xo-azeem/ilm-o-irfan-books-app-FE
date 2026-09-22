import { memo, useCallback, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { ChevronDown, ChevronUp, Mail } from 'lucide-react-native';

import {
  Card,
  Icon,
  LinearGradient,
  SearchField,
  SettingsGroup,
  SettingsRow,
  showDialog,
  Text,
} from '@/components/ui';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { useHomeCatalog } from '@/hooks/useCatalog';
import {
  aboutDetails,
  supportContact,
} from '@/features/profile/data/profileContent';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';
import { useStrings } from '@/i18n';

/**
 * Where "Rate the app" goes: the app's own Play listing, which is the page
 * that can actually take a review. The old link was a redirect on a domain
 * that never served it.
 */
const STORE_REVIEW_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/id0000000000?action=write-review'
    : 'https://play.google.com/store/apps/details?id=com.ilmoirfanapp';

/**
 * Help center.
 *
 * The four help topics as an accordion, with About and Rate folded in — three
 * near-empty screens become one page a reader can actually finish.
 */
export function HelpCenterScreen() {
  const { colors } = useTheme();
  const s = useStrings();
  const words = s.profile.help;
  // The address an admin set, from `app_settings` by way of the home feed.
  // The bundled one is only what an offline first launch has to fall back on.
  const { data: home } = useHomeCatalog();
  const supportEmail = home?.supportEmail || supportContact.email;
  const helpTopics = useMemo(
    () =>
      words.topics.map((topic, index) => ({
        id: `help${index + 1}`,
        ...topic,
      })),
    [words],
  );
  const [query, setQuery] = useState('');
  const [openTopic, setOpenTopic] = useState<string | null>(
    helpTopics[0]?.id ?? null,
  );

  const term = query.trim().toLowerCase();
  const topics = term
    ? helpTopics.filter(
        topic =>
          topic.question.toLowerCase().includes(term) ||
          topic.answer.toLowerCase().includes(term),
      )
    : helpTopics;

  const toggleTopic = useCallback((id: string) => {
    setOpenTopic(current => (current === id ? null : id));
  }, []);

  const emailSupport = useCallback(() => {
    void Linking.openURL(
      `mailto:${supportEmail}?subject=${encodeURIComponent(words.subject)}`,
    ).catch(() =>
      showDialog({
        title: words.noMailApp,
        message: words.writeToUs(supportEmail),
        tone: 'info',
        icon: Mail,
      }),
    );
  }, [supportEmail, words]);

  const rateApp = useCallback(() => {
    void Linking.openURL(STORE_REVIEW_URL).catch(() =>
      showDialog({
        title: words.storeFailed,
        message: words.storeFallback,
        tone: 'warning',
      }),
    );
  }, [words]);

  return (
    <ProfileSubScreenLayout title={words.title} gap={20}>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={words.searchPlaceholder}
      />

      {topics.length === 0 ? (
        <Card tone="alt" padded={16}>
          <Text size={fontSize.caption} leading={1.6} tone="muted">
            {words.nothingMatched(query.trim())}
          </Text>
        </Card>
      ) : (
        <View style={styles.topics}>
          {topics.map(topic => (
            <HelpTopic
              key={topic.id}
              id={topic.id}
              question={topic.question}
              answer={topic.answer}
              open={openTopic === topic.id}
              onToggle={toggleTopic}
            />
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={words.emailA11y(supportEmail)}
        onPress={emailSupport}
        style={({ pressed }) => [
          styles.support,
          { borderColor: colors.border },
          pressed && styles.pressed,
        ]}
      >
        <LinearGradient
          angle={135}
          stops={[
            { offset: 0, color: colors.primary, opacity: 0.18 },
            { offset: 1, color: colors.background, opacity: 0.95 },
          ]}
        />
        <View style={styles.supportBody}>
          <Text size={14.5} leading={1} weight="500">
            {words.stillStuck}
          </Text>
          <Text size={12.5} leading={1.2} tone="muted">
            {`${supportEmail} · ${words.replyTime}`}
          </Text>
        </View>
        <View
          style={[styles.supportAction, { backgroundColor: colors.primary }]}
        >
          <Text
            size={fontSize.caption}
            leading={1}
            weight="600"
            tone="onPrimary"
          >
            {words.emailUs}
          </Text>
        </View>
      </Pressable>

      <SettingsGroup title={words.about}>
        {aboutDetails.map(detail => (
          <SettingsRow
            key={detail.id}
            title={words[detail.id]}
            value={detail.value}
            chevron={false}
            dense
          />
        ))}
        <SettingsRow
          title={words.rateApp}
          value="★★★★★"
          onPress={rateApp}
          dense
        />
      </SettingsGroup>
    </ProfileSubScreenLayout>
  );
}

/** One accordion row. The open topic carries a green rim so it reads as active. */
const HelpTopic = memo(function HelpTopic({
  id,
  question,
  answer,
  open,
  onToggle,
}: {
  id: string;
  question: string;
  answer: string;
  open: boolean;
  onToggle: (id: string) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onToggle(id), [id, onToggle]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={question}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.topic,
        {
          backgroundColor: open ? colors.surface : colors.surfaceAlt,
          borderColor: open ? colors.selectedBorder : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topicHeader}>
        <Text size={14.5} leading={1.35} weight="500" style={styles.grow}>
          {question}
        </Text>
        <Icon
          icon={open ? ChevronUp : ChevronDown}
          size={14}
          tone={open ? 'primary' : 'faint'}
          strokeWidth={2.2}
        />
      </View>
      {open ? (
        <Text size={fontSize.caption} leading={1.6} tone="muted">
          {answer}
        </Text>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  topics: {
    gap: 11,
  },
  topic: {
    padding: 16,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: 10,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  grow: {
    flex: 1,
  },
  support: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  supportBody: {
    flex: 1,
    gap: 5,
  },
  supportAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.82,
  },
});
