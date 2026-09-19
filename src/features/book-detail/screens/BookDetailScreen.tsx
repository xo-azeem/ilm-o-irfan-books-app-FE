import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Lock, MoreVertical, Play } from 'lucide-react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import {
  AccessLabel,
  accessFor,
  BookCard,
  BookRail,
  type BookSummary,
} from '@/components/books';
import { Screen } from '@/components/layout';
import { BookDetailSkeleton } from '@/components/skeletons/CatalogSkeletons';
import {
  BookCover,
  Button,
  Display,
  EmptyState,
  IconButton,
  SaveButton,
  showDialog,
  Text,
  TextButton,
  UrduText,
} from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { CoverBackdrop } from '@/features/book-detail/components/CoverBackdrop';
import {
  StatStrip,
  type Stat,
} from '@/features/book-detail/components/StatStrip';
import { useWishlistMutation, useWishlistStatus } from '@/hooks/useAccount';
import { useStrings } from '@/i18n';
import { useBook, useHomeCatalog } from '@/hooks/useCatalog';
import { useAccess } from '@/lib/access';
import { reasonCopy } from '@/services/entitlements';
import { isUrduTitle } from '@/services/script';

/** The stat strip's two-letter code for each recorded language. */
const LANGUAGE_CODE = { urdu: 'UR', english: 'EN', arabic: 'AR' } as const;
import type { CatalogBook } from '@/services/catalog';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

type BookDetailRouteProp = RouteProp<RootStackParamList, 'BookDetail'>;
type BookDetailNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'BookDetail'
>;

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
    isUrdu: isUrduTitle(book.title),
  };
}

export function BookDetailScreen() {
  const navigation = useNavigation<BookDetailNavigationProp>();
  const route = useRoute<BookDetailRouteProp>();
  const { isDark } = useTheme();
  const s = useStrings();

  const { bookId } = route.params;
  const { data: book, isLoading } = useBook(bookId);
  const { data: home } = useHomeCatalog();
  const { data: saved } = useWishlistStatus(bookId);
  const wishlistMutation = useWishlistMutation(bookId);
  const { isAuthenticated, canOpenBooks, isSubscriptionLoading, reason } =
    useAccess();

  const [expanded, setExpanded] = useState(false);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const openPaywall = useCallback(() => {
    navigation.navigate(ROUTES.MAIN_TABS, {
      screen: ROUTES.PROFILE,
      // `initial: false` keeps Profile beneath the paywall even when that tab
      // has never been opened, so back from the plans page has somewhere to go.
      params: { screen: 'Subscription', initial: false },
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
      // The wording follows the reason the backend gave — "renew" reads wrong
      // to someone who has never subscribed, and a pitch reads wrong to someone
      // whose membership lapsed last week. The reason never decides anything;
      // it only picks the words.
      const copy = reasonCopy(reason);
      showDialog({
        title: copy.title,
        message: copy.message,
        tone: 'info',
        icon: Lock,
        actions: [
          { label: s.catalog.detail.notNow, style: 'cancel' },
          { label: s.catalog.detail.viewPlans, onPress: openPaywall },
        ],
      });
      return;
    }
    navigation.navigate(ROUTES.BOOK_READER, { bookId: book.id });
  }, [
    book,
    canOpenBooks,
    isAuthenticated,
    isSubscriptionLoading,
    navigation,
    openPaywall,
    reason,
    s,
  ]);

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
    showDialog({
      title: book?.title ?? s.catalog.detail.fallbackTitle,
      actions: [
        {
          label: saved ? s.common.removeFromLibrary : s.common.saveToLibrary,
          onPress: handleWishlist,
        },
        { label: s.common.cancel, style: 'cancel' },
      ],
    });
  }, [book?.title, handleWishlist, s, saved]);

  const stats = useMemo<Stat[]>(() => {
    if (!book) {
      return [];
    }
    const entries: Stat[] = [];
    if (book.rating != null) {
      entries.push({
        value: book.rating.toFixed(1),
        label: s.catalog.detail.rating,
      });
    }
    entries.push({ value: book.readTime, label: s.catalog.detail.readTime });
    if (book.genre) {
      entries.push({ value: book.genre, label: s.catalog.detail.subject });
    }
    // The recorded language, not the script of the title: "Jannat Ki Talash"
    // is an Urdu book with a Latin-script title, and the guess called it EN.
    // The guess is kept only for a deployment with no `language` column.
    entries.push({
      value: book.language
        ? LANGUAGE_CODE[book.language]
        : isUrduTitle(book.title)
          ? 'UR'
          : 'EN',
      label: s.catalog.detail.language,
    });
    return entries;
  }, [book, s]);

  // "Readers also loved" — trending titles other than this one.
  const alsoLoved = useMemo(
    () =>
      (home?.trending ?? []).filter(other => other.id !== bookId).slice(0, 6),
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
            title={s.catalog.detail.movedOnTitle}
            message={s.catalog.detail.movedOnMessage}
            action={{ label: s.common.goBack, onPress: goBack }}
          />
        </View>
      </Screen>
    );
  }

  const coverColor =
    (isDark ? book.coverColorDark : book.coverColor) ?? undefined;
  const access = accessFor(book);
  const isUrdu = isUrduTitle(book.title);

  return (
    <Screen
      gap={18}
      backdrop={
        <CoverBackdrop coverUrl={book.coverUrl} coverColor={coverColor} />
      }
    >
      <View style={styles.chrome}>
        <IconButton
          icon={ChevronLeft}
          onPress={goBack}
          variant="plain"
          accessibilityLabel={s.common.goBack}
        />
        <IconButton
          icon={MoreVertical}
          onPress={handleMore}
          variant="plain"
          accessibilityLabel={s.catalog.detail.moreOptions}
        />
      </View>

      <View style={styles.hero}>
        <BookCover
          width={158}
          coverUrl={book.coverUrl}
          coverColor={coverColor}
          rounded={12}
          elevated
          caption={s.home.coverCaption(book.title)}
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
          numberOfLines={expanded ? undefined : DESCRIPTION_LINES}
        >
          {book.description}
        </Text>
        {!expanded ? (
          <TextButton
            label={s.catalog.detail.readMore}
            onPress={() => setExpanded(true)}
            style={styles.readMore}
          />
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          label={
            canOpenBooks
              ? s.catalog.detail.readNow
              : s.catalog.detail.startReading
          }
          icon={Play}
          onPress={handleRead}
          size="md"
          style={styles.grow}
        />
        <SaveButton
          saved={Boolean(saved)}
          saving={wishlistMutation.isPending}
          onPress={handleWishlist}
          style={styles.grow}
        />
      </View>

      {alsoLoved.length > 0 ? (
        <BookRail title={s.catalog.detail.readersAlsoLoved} gap={12}>
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
