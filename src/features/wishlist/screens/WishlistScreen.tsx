import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { GuestAuthPanel } from '@/components/auth/GuestAuthPanel';
import { BookListRow, type BookSummary } from '@/components/books';
import { Screen, ScreenHeader } from '@/components/layout';
import { ListSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { EmptyState, TextButton } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useWishlist, useWishlistMutation } from '@/hooks/useAccount';
import { isUrduTitle } from '@/services/script';
import { useAuthStore } from '@/stores/authStore';

/**
 * Saved books.
 *
 * The same shelf the Library's "Saved" chip shows, reachable as its own screen
 * for the times a reader arrives here from a book rather than from the tab.
 */
export function WishlistScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const { data: items = [], isLoading } = useWishlist();

  const openBook = useCallback(
    (book: { id: string }) => navigation.navigate(ROUTES.BOOK_DETAIL, { bookId: book.id }),
    [navigation],
  );

  const browse = useCallback(
    () => navigation.navigate(ROUTES.MAIN_TABS, { screen: ROUTES.SEARCH }),
    [navigation],
  );

  return (
    <Screen gap={20}>
      <ScreenHeader
        title="Saved"
        subtitle="Books you have set aside for later."
        onBack={() => navigation.goBack()}
      />

      {!isAuthenticated ? (
        <GuestAuthPanel
          title="Save books for later."
          message="Sign in to keep a reading list that follows you across devices."
        />
      ) : isLoading ? (
        <ListSkeleton count={5} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            title="Nothing saved yet."
            message="Tap the bookmark on any book and it will wait for you here."
            action={{ label: 'Find something to read', onPress: browse }}
          />
        </View>
      ) : (
        <View style={styles.list}>
          {items.map(item => (
            <WishlistRow
              key={item.id}
              book={{
                id: item.id,
                title: item.title,
                author: item.author,
                coverUrl: item.coverUrl,
                coverColor: item.coverColor,
                coverColorDark: item.coverColorDark,
                isPremium: item.isPremium,
                price: item.price,
                currency: item.currency,
                isUrdu: isUrduTitle(item.title),
              }}
              onPress={openBook}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

/**
 * Split out so each row owns its own remove mutation — a shared one would make
 * every row re-render whenever any single book was removed.
 */
const WishlistRow = memo(function WishlistRow({
  book,
  onPress,
}: {
  book: BookSummary;
  onPress: (book: BookSummary) => void;
}) {
  const mutation = useWishlistMutation(book.id);
  const handleRemove = useCallback(() => mutation.mutate(true), [mutation]);

  return (
    <BookListRow
      book={book}
      onPress={onPress}
      trailing={
        <TextButton
          label="Remove"
          tone="muted"
          onPress={handleRemove}
          accessibilityLabel={`Remove ${book.title} from saved`}
        />
      }
    />
  );
});

const styles = StyleSheet.create({
  list: {
    gap: 14,
  },
  empty: {
    paddingTop: 48,
  },
});
