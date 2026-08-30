import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Search } from 'lucide-react-native';

import { Icon, Label, Text } from '@/components/ui';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

export type Suggestion =
  | { kind: 'query'; value: string }
  | { kind: 'author'; value: string };

/**
 * Query completions and author matches, shown above the results while the
 * reader is still typing. Author rows carry an initial rather than a magnifier,
 * so the two kinds are distinguishable at a glance.
 */
export const SearchSuggestions = memo(function SearchSuggestions({
  query,
  suggestions,
  onSelect,
}: {
  query: string;
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
}) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.root}>
      <Label>Suggestions</Label>
      <View>
        {suggestions.map(suggestion => (
          <SuggestionRow
            key={`${suggestion.kind}:${suggestion.value}`}
            query={query}
            suggestion={suggestion}
            onSelect={onSelect}
          />
        ))}
      </View>
    </View>
  );
});

const SuggestionRow = memo(function SuggestionRow({
  query,
  suggestion,
  onSelect,
}: {
  query: string;
  suggestion: Suggestion;
  onSelect: (suggestion: Suggestion) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onSelect(suggestion), [onSelect, suggestion]);

  // The typed portion stays bright; the completion recedes, so the reader can
  // see at a glance what tapping would add.
  const typed = suggestion.value.slice(0, query.length);
  const rest = suggestion.value.slice(query.length);
  const matchesPrefix = suggestion.value.toLowerCase().startsWith(query.toLowerCase());

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={suggestion.value}
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {suggestion.kind === 'author' ? (
        <View style={[styles.authorMark, { backgroundColor: colors.goldFill }]}>
          <Text size={9} leading={1} weight="600" tone="gold">
            {suggestion.value.slice(0, 1).toUpperCase()}
          </Text>
        </View>
      ) : (
        <Icon icon={Search} size={16} tone="faint" strokeWidth={1.8} />
      )}

      <Text size={fontSize.body} leading={1.2} numberOfLines={1} style={styles.grow}>
        {matchesPrefix ? typed : suggestion.value}
        {matchesPrefix ? (
          <Text size={fontSize.body} leading={1.2} tone="muted">
            {rest}
          </Text>
        ) : null}
        {suggestion.kind === 'author' ? (
          <Text size={fontSize.body} leading={1.2} tone="faint">
            {' · author'}
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  authorMark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: {
    flex: 1,
  },
  pressed: {
    opacity: 0.65,
  },
});
