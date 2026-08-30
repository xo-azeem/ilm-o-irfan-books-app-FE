import { memo, useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

import {
  Card,
  Icon,
  LinearGradient,
  SearchField,
  SettingsGroup,
  SettingsRow,
  Text,
} from '@/components/ui';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import {
  aboutDetails,
  helpTopics,
  supportContact,
} from '@/features/profile/data/profileContent';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

const STORE_REVIEW_URL = 'https://ilmoirfan.com/rate';

/**
 * Help center.
 *
 * The four help topics as an accordion, with About and Rate folded in — three
 * near-empty screens become one page a reader can actually finish.
 */
export function HelpCenterScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [openTopic, setOpenTopic] = useState<string | null>(helpTopics[0]?.id ?? null);

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
      `mailto:${supportContact.email}?subject=${encodeURIComponent('Ilm o Irfan support')}`,
    ).catch(() =>
      Alert.alert('No mail app', `Write to us at ${supportContact.email}.`),
    );
  }, []);

  const rateApp = useCallback(() => {
    void Linking.openURL(STORE_REVIEW_URL).catch(() =>
      Alert.alert('Could not open the store', 'Please search for Ilm o Irfan in your app store.'),
    );
  }, []);

  return (
    <ProfileSubScreenLayout title="Help center" gap={20}>
      <SearchField
        value={query}
        onChangeText={setQuery}
        onClear={() => setQuery('')}
        placeholder="Search help topics"
      />

      {topics.length === 0 ? (
        <Card tone="alt" padded={16}>
          <Text size={fontSize.caption} leading={1.6} tone="muted">
            Nothing matched “{query.trim()}”. Try a different word, or email us below.
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
        accessibilityLabel={`Email ${supportContact.email}`}
        onPress={emailSupport}
        style={({ pressed }) => [
          styles.support,
          { borderColor: colors.border },
          pressed && styles.pressed,
        ]}>
        <LinearGradient
          angle={135}
          stops={[
            { offset: 0, color: colors.primary, opacity: 0.18 },
            { offset: 1, color: colors.background, opacity: 0.95 },
          ]}
        />
        <View style={styles.supportBody}>
          <Text size={14.5} leading={1} weight="500">
            Still stuck?
          </Text>
          <Text size={12.5} leading={1.2} tone="muted">
            {`${supportContact.email} · ${supportContact.replyTime}`}
          </Text>
        </View>
        <View style={[styles.supportAction, { backgroundColor: colors.primary }]}>
          <Text size={fontSize.caption} leading={1} weight="600" tone="onPrimary">
            Email us
          </Text>
        </View>
      </Pressable>

      <SettingsGroup title="About">
        {aboutDetails.map(detail => (
          <SettingsRow key={detail.id} title={detail.label} value={detail.value} chevron={false} dense />
        ))}
        <SettingsRow
          title="Rate the app"
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
      ]}>
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
