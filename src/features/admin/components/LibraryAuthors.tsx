import { memo, useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Icon, Text } from '@/components/ui';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminAvatar,
  AdminEmpty,
  AdminErrorState,
  AdminEyebrow,
  AdminRowGroup,
} from '@/features/admin/components/AdminUi';
import { AdminRowsSkeleton } from '@/features/admin/components/AdminSkeletons';
import { useAppInsets } from '@/hooks/useAppInsets';
import { useAdminAuthors } from '@/hooks/useAdmin';
import { adminCoverUrl, type AdminAuthor } from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

type LetterGroup = { letter: string; authors: AdminAuthor[] };

/**
 * Authors, grouped A–Z.
 *
 * The alphabet does the work a search box otherwise has to: a catalog of forty
 * names is scannable without typing. An author credited on nothing is flagged
 * in amber, because that is almost always a typo waiting to be merged.
 */
export const LibraryAuthors = memo(function LibraryAuthors({
  query,
  onOpen,
  onCreate,
}: {
  query: string;
  onOpen: (authorId: string) => void;
  onCreate: () => void;
}) {
  const { scrollEndPadding } = useAppInsets();
  const {
    data = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useAdminAuthors(query);

  const groups = useMemo<LetterGroup[]>(() => {
    const byLetter = new Map<string, AdminAuthor[]>();

    for (const author of [...data].sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      // Anything that does not start with a Latin letter — an Urdu name, a
      // kunya opening with a quote — collects under a single bucket rather
      // than inventing a heading nobody can scan for.
      const initial = author.name.trim().charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(initial) ? initial : '#';
      const bucket = byLetter.get(letter);
      if (bucket) {
        bucket.push(author);
      } else {
        byLetter.set(letter, [author]);
      }
    }

    return [...byLetter.entries()]
      .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
      .map(([letter, authors]) => ({ letter, authors }));
  }, [data]);

  const renderGroup = useCallback(
    ({ item }: { item: LetterGroup }) => (
      <View style={styles.group}>
        <AdminEyebrow tone="dim">{item.letter}</AdminEyebrow>
        <AdminRowGroup>
          {item.authors.map(author => (
            <AuthorRow key={author.id} author={author} onPress={onOpen} />
          ))}
        </AdminRowGroup>
      </View>
    ),
    [onOpen],
  );

  if (isLoading) {
    return (
      <View style={styles.gutter}>
        <AdminRowsSkeleton count={4} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.gutter}>
        <AdminErrorState
          message="The author list could not be loaded."
          detail={errorMessage(error)}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={groups}
      keyExtractor={item => item.letter}
      renderItem={renderGroup}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      contentContainerStyle={{
        paddingHorizontal: ADMIN_GUTTER,
        paddingBottom: scrollEndPadding + 20,
      }}
      ListEmptyComponent={
        <AdminEmpty
          title={query ? 'No authors match' : 'No authors yet'}
          message={
            query
              ? 'Try a shorter search — the list matches on name and slug.'
              : 'Every book needs an author. Add the first one and it becomes selectable in the book editor.'
          }
          actionLabel={query ? undefined : 'Add the first author'}
          onAction={onCreate}
        />
      }
      style={styles.list}
    />
  );
});

const AuthorRow = memo(function AuthorRow({
  author,
  onPress,
}: {
  author: AdminAuthor;
  onPress: (authorId: string) => void;
}) {
  const { colors } = useTheme();
  const orphan = author.book_count === 0;
  const handlePress = useCallback(
    () => onPress(author.id),
    [author.id, onPress],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={author.name}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.primaryFillSoft },
      ]}
    >
      <AdminAvatar
        name={author.name}
        imageUrl={adminCoverUrl(author.avatar_path)}
        size={34}
        tone={orphan ? 'warning' : 'primary'}
      />

      <View style={styles.body}>
        <Text size={14} leading={1.2} numberOfLines={1}>
          {author.name}
        </Text>
        <Text
          size={11}
          leading={1.2}
          tone={orphan ? 'warning' : 'faint'}
          numberOfLines={1}
        >
          {orphan
            ? 'No books yet'
            : `${author.book_count} ${author.book_count === 1 ? 'book' : 'books'} · ${
                author.published_count
              } live`}
        </Text>
      </View>

      <Icon icon={ChevronRight} size={15} color={colors.dim} strokeWidth={2} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  gutter: {
    paddingHorizontal: ADMIN_GUTTER,
  },
  group: {
    gap: 8,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
});
