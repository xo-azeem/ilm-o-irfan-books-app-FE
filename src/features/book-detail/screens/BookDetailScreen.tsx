import { useMemo, useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Heart } from 'lucide-react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import { BookDetailSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { DisplayText, Text } from '@/components/ui';
import { BookCoverPlaceholder } from '@/components/books';
import { ROUTES } from '@/constants/routes';
import { useBook } from '@/hooks/useCatalog';
import { useWishlistMutation, useWishlistStatus } from '@/hooks/useAccount';
import { useAccess } from '@/lib/access';
import { palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

type BookDetailRouteProp = RouteProp<RootStackParamList, 'BookDetail'>;
type BookDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookDetail'>;

const COVER_ASPECT = 1.42;

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price);
}

function useBookDetailLayout() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const horizontalPadding = Math.max(20, Math.round(screenWidth * 0.05));
    const sectionGap = 16;
    const blockGap = 22;
    const contentGap = 8;
    const contentTopPadding = 20;

    const footerPaddingTop = 12;
    const footerPaddingBottom = Math.max(insets.bottom, 10);
    const footerButtonHeight = 50;

    const headerTop = insets.top + 8;
    const backToCoverGap = 16;
    const heroBottomPadding = 20;

    const maxCoverHeight = screenHeight * 0.25;
    const coverWidth = Math.min(
      screenWidth - horizontalPadding * 2,
      maxCoverHeight / COVER_ASPECT,
      screenWidth * 0.44,
    );
    const coverHeight = coverWidth * COVER_ASPECT;

    return {
      horizontalPadding,
      sectionGap,
      blockGap,
      contentGap,
      contentTopPadding,
      footerPaddingTop,
      footerPaddingBottom,
      footerButtonHeight,
      headerTop,
      backToCoverGap,
      heroBottomPadding,
      coverWidth,
      coverHeight,
      scrollBottomPadding: 16,
    };
  }, [screenWidth, screenHeight, insets.top, insets.bottom]);
}

export function BookDetailScreen() {
  const navigation = useNavigation<BookDetailNavigationProp>();
  const route = useRoute<BookDetailRouteProp>();
  const { isDark, colors } = useTheme();
  const layout = useBookDetailLayout();

  const { data: book, isLoading } = useBook(route.params.bookId);
  const { data: saved } = useWishlistStatus(route.params.bookId);
  const wishlistMutation = useWishlistMutation(route.params.bookId);
  const { isAuthenticated, canOpenBooks, isSubscriptionLoading } = useAccess();

  const openPaywall = useCallback(() => {
    navigation.navigate(ROUTES.MAIN_TABS, {
      screen: ROUTES.PROFILE,
      params: { screen: 'Subscription' },
    });
  }, [navigation]);

  const handleReadBook = useCallback(() => {
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
        'Subscription required',
        'An active subscription is required to open books.',
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

  if (!book && !isLoading) {
    return (
      <View className="flex-1 bg-app-bg dark:bg-app-bg-dark">
        <View
          className="flex-1"
          style={{
            paddingTop: layout.headerTop,
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: layout.footerPaddingBottom,
          }}>
          <BackLink onPress={() => navigation.goBack()} />
          <View className="flex-1 items-center justify-center gap-3">
            <DisplayText className="text-center text-[22px] font-semibold text-app-ink dark:text-app-ink-dark">
              Book not found
            </DisplayText>
            <Text className="text-center text-[15px] text-app-muted dark:text-app-muted-dark">
              This title is no longer in the catalog.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!book) {
    return <BookDetailSkeleton />;
  }

  const coverColor = isDark ? book.coverColorDark : book.coverColor;

  return (
    <View className="flex-1 bg-app-bg dark:bg-app-bg-dark">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: layout.scrollBottomPadding }}>
        <View style={styles.hero}>
          <View style={styles.heroBackdrop} pointerEvents="none">
            <BookDetailHeroBackdrop
              coverUrl={book.coverUrl}
              coverColor={coverColor}
              isDark={isDark}
            />
          </View>

          <View
            style={{
              paddingTop: layout.headerTop,
              paddingHorizontal: layout.horizontalPadding,
              paddingBottom: layout.heroBottomPadding,
            }}>
            <BackLink onPress={() => navigation.goBack()} />

            <View
              style={{
                marginTop: layout.backToCoverGap,
                alignItems: 'center',
              }}>
              <BookCoverPlaceholder
                width={layout.coverWidth}
                height={layout.coverHeight}
                coverColor={coverColor}
                coverUrl={book.coverUrl}
                borderRadius={20}
                tag={book.tag}
                tagPlacement="bottom-left"
                style={styles.coverShadow}
              />
            </View>
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.contentTopPadding,
          }}>
          <View
            className="flex-row flex-wrap items-center"
            style={{ gap: layout.contentGap }}>
            {book.genre ? (
              <Text className="rounded-full bg-app-fill px-3 py-1.5 text-[12px] font-medium text-app-primary dark:bg-app-fill-dark dark:text-app-primary-dark">
                {book.genre}
              </Text>
            ) : null}
            <Text className="text-[12px] font-medium uppercase tracking-[1.4px] text-app-faint dark:text-app-faint-dark">
              {book.format}
            </Text>
          </View>

          <DisplayText
            className="text-[28px] font-bold leading-[34px] tracking-tight text-app-ink dark:text-app-ink-dark"
            style={{ marginTop: 14 }}>
            {book.title}
          </DisplayText>

          <Text
            className="text-[17px] leading-6 text-app-muted dark:text-app-muted-dark"
            style={{ marginTop: 6 }}>
            {book.author}
          </Text>

          <View
            className="flex-row items-end justify-between border-b border-app-border dark:border-app-border-dark"
            style={{
              marginTop: layout.sectionGap,
              paddingBottom: layout.sectionGap,
            }}>
            <View style={{ gap: 6 }}>
              <Text className="text-[12px] font-medium uppercase tracking-[1.4px] text-app-faint dark:text-app-faint-dark">
                Price
              </Text>
              <Text className="text-[32px] font-bold tabular-nums tracking-tight text-app-ink dark:text-app-ink-dark">
                {formatPrice(book.price, book.currency)}
              </Text>
            </View>
            {book.rating != null ? (
              <View className="items-end" style={{ gap: 6 }}>
                <Text className="text-[12px] font-medium uppercase tracking-[1.4px] text-app-faint dark:text-app-faint-dark">
                  Rating
                </Text>
                <Text className="text-[20px] font-semibold tabular-nums text-app-ink dark:text-app-ink-dark">
                  {book.rating.toFixed(1)}
                  <Text className="text-[14px] font-normal text-app-muted dark:text-app-muted-dark">
                    {' '}
                    / 5
                  </Text>
                </Text>
              </View>
            ) : null}
          </View>

          <View
            className="flex-row"
            style={{ marginTop: layout.sectionGap, gap: 10 }}>
            <DetailCell label="Read time" value={book.readTime} />
            <DetailCell label="Availability" value="In library" />
          </View>

          <View style={{ marginTop: layout.blockGap, gap: 10 }}>
            <Text className="text-[12px] font-medium uppercase tracking-[1.4px] text-app-faint dark:text-app-faint-dark">
              Synopsis
            </Text>
            <Text className="text-[16px] leading-[26px] text-app-ink dark:text-app-ink-dark">
              {book.description}
            </Text>
          </View>

          <View style={{ marginTop: layout.blockGap, gap: 10 }}>
            <Text className="text-[12px] font-medium uppercase tracking-[1.4px] text-app-faint dark:text-app-faint-dark">
              Details
            </Text>
            <View className="overflow-hidden rounded-[16px] border border-app-border bg-app-surface dark:border-app-border-dark dark:bg-app-surface-dark">
              <DetailRow label="Author" value={book.author} />
              <DetailRow label="Category" value={book.genre ?? 'General'} />
              <DetailRow label="Format" value={book.format} isLast />
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        className="border-t border-app-border bg-app-bg dark:border-app-border-dark dark:bg-app-bg-dark"
        style={{
          paddingTop: layout.footerPaddingTop,
          paddingBottom: layout.footerPaddingBottom,
          paddingHorizontal: layout.horizontalPadding,
        }}>
        <View className="flex-row" style={{ gap: 10 }}>
          <Pressable
            onPress={handleWishlist}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from wishlist' : 'Save to wishlist'}
            style={{ height: layout.footerButtonHeight }}
            className="flex-1 items-center justify-center rounded-[14px] border border-app-border bg-app-surface active:opacity-80 dark:border-app-border-dark dark:bg-app-surface-dark">
            <View className="flex-row items-center gap-2">
              <Heart
                size={16}
                color={colors.primary}
                fill={saved ? colors.primary : 'transparent'}
                strokeWidth={2}
              />
              <Text className="text-[16px] font-semibold text-app-ink dark:text-app-ink-dark">
                {saved ? 'Saved' : 'Save'}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={handleReadBook}
            accessibilityRole="button"
            accessibilityLabel={`Read ${book.title}`}
            style={{
              height: layout.footerButtonHeight,
              backgroundColor: colors.primary,
            }}
            className="flex-1 items-center justify-center rounded-[14px] active:opacity-90">
            <Text className="text-[16px] font-semibold text-white">
              {!isAuthenticated
                ? 'Sign in to read'
                : canOpenBooks
                  ? 'Read book'
                  : 'Subscribe to read'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type BookDetailHeroBackdropProps = {
  coverUrl?: string;
  coverColor: string;
  isDark: boolean;
};

function BookDetailHeroBackdrop({
  coverUrl,
  coverColor,
  isDark,
}: BookDetailHeroBackdropProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(coverUrl) && !imageFailed;

  if (!showImage) {
    return (
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: coverColor }]}>
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.18)' },
          ]}
        />
      </View>
    );
  }

  return (
    <>
      <Image
        source={{ uri: coverUrl }}
        style={styles.heroImage}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        onError={() => setImageFailed(true)}
      />
      <BlurView
        style={StyleSheet.absoluteFillObject}
        blurType={isDark ? 'dark' : 'light'}
        blurAmount={isDark ? 20 : 28}
        reducedTransparencyFallbackColor={coverColor}
        {...(Platform.OS === 'android'
          ? { overlayColor: 'transparent', blurRadius: 24, downsampleFactor: 4 }
          : null)}
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.24)' : 'rgba(255, 255, 255, 0.34)',
          },
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: coverColor, opacity: isDark ? 0.16 : 0.1 },
        ]}
      />
    </>
  );
}

type BackLinkProps = {
  onPress: () => void;
};

function BackLink({ onPress }: BackLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      className="-ml-1 flex-row items-center gap-0.5 self-start py-1 active:opacity-60"
      style={{ height: 40 }}>
      <ChevronLeft size={22} color={palette.green} strokeWidth={2.25} />
      <Text className="text-[15px] font-medium text-app-primary dark:text-app-primary-dark">
        Back
      </Text>
    </Pressable>
  );
}

type DetailCellProps = {
  label: string;
  value: string;
};

function DetailCell({ label, value }: DetailCellProps) {
  return (
    <View className="min-w-0 flex-1 rounded-[14px] border border-app-border bg-app-surface px-4 py-3.5 dark:border-app-border-dark dark:bg-app-surface-dark">
      <Text className="text-[11px] font-medium uppercase tracking-[1.2px] text-app-faint dark:text-app-faint-dark">
        {label}
      </Text>
      <Text
        className="mt-1.5 text-[15px] font-medium text-app-ink dark:text-app-ink-dark"
        numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
  isLast?: boolean;
};

function DetailRow({ label, value, isLast = false }: DetailRowProps) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3.5 ${
        !isLast ? 'border-b border-app-border dark:border-app-border-dark' : ''
      }`}>
      <Text className="shrink-0 text-[14px] text-app-muted dark:text-app-muted-dark">
        {label}
      </Text>
      <Text
        className="ml-4 max-w-[58%] text-right text-[14px] font-medium text-app-ink dark:text-app-ink-dark"
        numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 1.28 }],
  },
  coverShadow: {
    shadowColor: '#0E1410',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
});
