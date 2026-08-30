import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bookmark, ChevronLeft, MoreVertical, Play } from 'lucide-react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import { AccessLabel, accessFor, BookCard, BookRail, type BookSummary } from '@/components/books';
import { Screen } from '@/components/layout';
import { BookDetailSkeleton } from '@/components/skeletons/CatalogSkeletons';
import {
  BookCover,
  Button,
  Display,
  EmptyState,
  IconButton,
  Text,
  TextButton,
  UrduText,
} from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { CoverBackdrop } from '@/features/book-detail/components/CoverBackdrop';
import { StatStrip, type Stat } from '@/features/book-detail/components/StatStrip';
import { useWishlistMutation, useWishlistStatus } from '@/hooks/useAccount';
import { useBook, useHomeCatalog } from '@/hooks/useCatalog';
import { useAccess } from '@/lib/access';
import { isUrduTitle } from '@/services/script';
import type { CatalogBook } from '@/services/catalog';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

type BookDetailRouteProp = RouteProp<RootStackParamList, 'BookDetail'>;
type BookDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookDetail'>;

const DESCRIPTION_LINES = 3;

function toSummary(book: CatalogBook): BookSummary {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    coverColor: book.coverColor,
    coverColorDark: book.coverColorDark,
    isPremium: book.isPremium,
    price: book.price,
    currency: book.currency,
    isUrdu: isUrduTitle(book.title),
  };
}

export function BookDetailScreen() {
  const navigation = useNavigation<BookDetailNavigationProp>();
  const route = useRoute<BookDetailRouteProp>();
  const { isDark } = useTheme();

  const { bookId } = route.params;
  const { data: book, isLoading } = useBook(bookId);
  const { data: home } = useHomeCatalog();
  const { data: saved } = useWishlistStatus(bookId);
  const wishlistMutation = useWishlistMutation(bookId);
  const { isAuthenticated, canOpenBooks, isSubscriptionLoading } = useAccess();

  const [expanded, setExpanded] = useState(false);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const openPaywall = useCallback(() => {
    navigation.navigate(ROUTES.MAIN_TABS, {
      screen: ROUTES.PROFILE,
      params: { screen: 'Subscription' },
    });
  }, [navigation]);

  const handleRead = useCallback(() => {
    if (!book) {
      return;
    }
    if (!isAuthenticated) {
      navigation.navigate(ROUTES.LOGIN, { returnTo: { bookId: book.id } });
      return;
    }
    if (isSubscriptionLoading) {
      return;
    }
    if (!canOpenBooks) {
      Alert.alert(
        'Membership required',
        'An active membership is required to open books.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'View plans', onPress: openPaywall },
        ],
      );
      return;
    }
    navigation.navigate(ROUTES.BOOK_READER, { bookId: book.id });
  }, [book, canOpenBooks, isAuthenticated, isSubscriptionLoading, navigation, openPaywall]);

  const handleWishlist = useCallback(() => {
    if (!book) {
      return;
    }
    if (!isAuthenticated) {
      navigation.navigate(ROUTES.LOGIN, { returnTo: { bookId: book.id } });
      return;
    }
    wishlistMutation.mutate(Boolean(saved));
  }, [book, isAuthenticated, navigation, saved, wishlistMutation]);

  const handleMore = useCallback(() => {
    Alert.alert(book?.title ?? 'Book', undefined, [
      { text: saved ? 'Remove from library' : 'Save to library', onPress: handleWishlist },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [book?.title, handleWishlist, saved]);

  const stats = useMemo<Stat[]>(() => {
    if (!book) {
      return [];
    }
    const entries: Stat[] = [];
    if (book.rating != null) {
      entries.push({ value: book.rating.toFixed(1), label: 'RATING' });
    }
    entries.push({ value: book.readTime, label: 'READ TIME' });
    if (book.genre) {
      entries.push({ value: book.genre, label: 'SUBJECT' });
    }
    entries.push({
      value: isUrduTitle(book.title) ? 'UR' : 'EN',
      label: 'LANGUAGE',
    });
    return entries;
  }, [book]);

  // "Readers also loved" — trending titles other than this one.
  const alsoLoved = useMemo(
    () => (home?.trending ?? []).filter(other => other.id !== bookId).slice(0, 6),
    [bookId, home?.trending],
  );

  if (isLoading) {
    return (
      <Screen gap={20} edgeToEdge={false}>
        <BookDetailSkeleton />
      </Screen>
    );
  }

  if (!book) {
    return (
      <Screen scrollable={false}>
        <View style={styles.notFound}>
          <EmptyState
            art={null}
            title="This title has moved on."
            message="It is no longer in the catalogue. Nothing on your shelf was affected."
            action={{ label: 'Go back', onPress: goBack }}
          />
        </View>
      </Screen>
    );
  }

  const coverColor = (isDark ? book.coverColorDark : book.coverColor) ?? undefined;
  const access = accessFor(book);
  const isUrdu = isUrduTitle(book.title);

  return (
    <Screen
      gap={18}
      backdrop={<CoverBackdrop coverUrl={book.coverUrl} coverColor={coverColor} />}>
      <View style={styles.chrome}>
        <IconButton
          icon={ChevronLeft}
          onPress={goBack}
          variant="plain"
          accessibilityLabel="Go back"
        />
        <View style={styles.chromeActions}>
          <IconButton
            icon={Bookmark}
            onPress={handleWishlist}
            variant={saved ? 'ghost' : 'plain'}
            accessibilityLabel={saved ? 'Remove from library' : 'Save to library'}
          />
          <IconButton
            icon={MoreVertical}
            onPress={handleMore}
            variant="plain"
            accessibilityLabel="More options"
          />
        </View>
      </View>

      <View style={styles.hero}>
        <BookCover
          width={158}
          coverUrl={book.coverUrl}
          coverColor={coverColor}
          rounded={12}
          elevated
          caption={`COVER · ${book.title.toUpperCase()}`}
        />

        <View style={styles.title}>
          {isUrdu ? (
            <UrduText size={26} align="center">
              {book.title}
            </UrduText>
          ) : (
            <Display size="heading" align="center">
              {book.title}
            </Display>
          )}

          <Text size={fontSize.bodySmall} leading={1.2} tone="muted">
            {book.author}
          </Text>

          <AccessLabel access={access} variant="badge" />
        </View>
      </View>

      <StatStrip stats={stats} />

      <View>
        <Text
          size={fontSize.bodySmall}
          leading={1.7}
          tone="soft"
          numberOfLines={expanded ? undefined : DESCRIPTION_LINES}>
          {book.description}
        </Text>
        {!expanded ? (
          <TextButton label="Read more" onPress={() => setExpanded(true)} style={styles.readMore} />
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          label={canOpenBooks ? 'Read now' : 'Start reading'}
          icon={Play}
          onPress={handleRead}
          size="md"
          style={styles.grow}
        />
        <Button
          label={saved ? 'Saved' : 'Save'}
          variant={saved ? 'ghost' : 'secondary'}
          onPress={handleWishlist}
          size="md"
          style={styles.grow}
        />
      </View>

      {alsoLoved.length > 0 ? (
        <BookRail title="Readers also loved" gap={12}>
          {alsoLoved.map(other => (
            <BookCard
              key={other.id}
              book={toSummary(other)}
              width={92}
              showAuthor={false}
              onPress={() =>
                navigation.push(ROUTES.BOOK_DETAIL, { bookId: other.id })
              }
            />
          ))}
        </BookRail>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chromeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  hero: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 6,
  },
  title: {
    alignItems: 'center',
    gap: 8,
    maxWidth: 300,
  },
  readMore: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  grow: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
  },
});
