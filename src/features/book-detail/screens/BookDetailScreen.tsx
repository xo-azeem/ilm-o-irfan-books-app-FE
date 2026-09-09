import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Heart } from 'lucide-react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import { api } from '@/api';
import { ApiError } from '@/api/edge';
import { formatReadTime } from '@/api/mappers';
import type { BookDetail } from '@/api/types';
import { DisplayText, Text } from '@/components/ui';
import { BookCoverPlaceholder } from '@/components/books';
import { ROUTES } from '@/constants/routes';
import { palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';
import { useEntitlementStore } from '@/stores/entitlementStore';

type BookDetailRouteProp = RouteProp<RootStackParamList, 'BookDetail'>;
type BookDetailNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'BookDetail'
>;

const COVER_ASPECT = 1.42;

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

function paywallMessage(reason: string | undefined): string {
  switch (reason) {
    case 'lapsed':
    case 'expired':
      return 'Your subscription has ended. Renew to keep reading.';
    case 'billing_issue_paid_through':
    case 'grace':
      return 'There is a billing issue on your subscription. Update billing to avoid losing access.';
    case 'none':
    default:
      return 'An active Ilm o Irfan membership is required to open this book.';
  }
}

export function BookDetailScreen() {
  const navigation = useNavigation<BookDetailNavigationProp>();
  const route = useRoute<BookDetailRouteProp>();
  const { isDark, colors } = useTheme();
  const layout = useBookDetailLayout();
  const canAccessPremium = useEntitlementStore(s => s.canAccessPremium);
  const entitlementReason = useEntitlementStore(s => s.status?.reason);
  const refreshEntitlement = useEntitlementStore(s => s.refresh);

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState(false);
  const [togglingWish, setTogglingWish] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const detail = await api.bookDetail(route.params.bookId);
        if (!cancelled) {
          setBook(detail);
        }
      } catch {
        if (!cancelled) {
          setBook(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route.params.bookId]);

  const handleReadBook = useCallback(async () => {
    if (!book) {
      return;
    }
    await refreshEntitlement();
    const entitled = useEntitlementStore.getState().canAccessPremium;
    if (!entitled) {
      Alert.alert('Membership required', paywallMessage(entitlementReason), [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: () =>
            navigation.navigate(ROUTES.MAIN_TABS, {
              screen: ROUTES.PROFILE,
              params: { screen: 'Subscription' },
            }),
        },
      ]);
      return;
    }
    navigation.navigate(ROUTES.BOOK_READER, { bookId: book.id });
  }, [book, entitlementReason, navigation, refreshEntitlement]);

  const handleWishlist = useCallback(async () => {
    if (!book || togglingWish) {
      return;
    }
    setTogglingWish(true);
    try {
      const result = await api.wishlistToggle(book.id);
      setWishlisted(Boolean(result.wishlisted));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not update wishlist';
      Alert.alert('Wishlist', message);
    } finally {
      setTogglingWish(false);
    }
  }, [book, togglingWish]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-app-bg-dark">
        <ActivityIndicator size="large" color={palette.green} />
      </View>
    );
  }

  if (!book) {
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

  const coverColor = isDark
    ? book.cover_color_dark ?? palette.green
    : book.cover_color ?? palette.green;
  const heroTint = `${coverColor}${isDark ? '30' : '18'}`;
  const authorName = book.author?.name ?? book.author_name ?? 'Unknown author';

  return (
    <View className="flex-1 bg-app-bg dark:bg-app-bg-dark">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: layout.scrollBottomPadding }}>
        <View
          style={[
            styles.hero,
            {
              backgroundColor: heroTint,
              paddingTop: layout.headerTop,
              paddingHorizontal: layout.horizontalPadding,
              paddingBottom: layout.heroBottomPadding,
            },
          ]}>
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
              tag={book.tag ?? undefined}
              tagPlacement="bottom-left"
              style={styles.coverShadow}
            />
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
              {book.format ?? 'Digital edition'}
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
            {authorName}
          </Text>

          <View
            className="flex-row items-end justify-between border-b border-app-border dark:border-app-border-dark"
            style={{
              marginTop: layout.sectionGap,
              paddingBottom: layout.sectionGap,
            }}>
            <View style={{ gap: 6 }}>
              <Text className="text-[12px] font-medium uppercase tracking-[1.4px] text-app-faint dark:text-app-faint-dark">
                Access
              </Text>
              <Text className="text-[18px] font-semibold text-app-ink dark:text-app-ink-dark">
                {canAccessPremium ? 'Included in membership' : 'Members only'}
              </Text>
            </View>
            {book.rating != null ? (
              <View className="items-end" style={{ gap: 6 }}>
                <Text className="text-[12px] font-medium uppercase tracking-[1.4px] text-app-faint dark:text-app-faint-dark">
                  Rating
                </Text>
                <Text className="text-[20px] font-semibold tabular-nums text-app-ink dark:text-app-ink-dark">
                  {Number(book.rating).toFixed(1)}
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
            <DetailCell
              label="Read time"
              value={formatReadTime(book.read_time_minutes) || '—'}
            />
            <DetailCell
              label="Availability"
              value={canAccessPremium ? 'Ready to read' : 'Subscribe to open'}
            />
          </View>

          <View style={{ marginTop: layout.blockGap, gap: 10 }}>
            <Text className="text-[12px] font-medium uppercase tracking-[1.4px] text-app-faint dark:text-app-faint-dark">
              Synopsis
            </Text>
            <Text className="text-[16px] leading-[26px] text-app-ink dark:text-app-ink-dark">
              {book.description ?? 'No description yet.'}
            </Text>
          </View>

          <View style={{ marginTop: layout.blockGap, gap: 10 }}>
            <Text className="text-[12px] font-medium uppercase tracking-[1.4px] text-app-faint dark:text-app-faint-dark">
              Details
            </Text>
            <View className="overflow-hidden rounded-[16px] border border-app-border bg-app-surface dark:border-app-border-dark dark:bg-app-surface-dark">
              <DetailRow label="Author" value={authorName} />
              <DetailRow label="Category" value={book.genre ?? 'General'} />
              <DetailRow
                label="Format"
                value={book.format ?? 'Digital edition'}
                isLast
              />
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
            onPress={() => void handleWishlist()}
            accessibilityRole="button"
            accessibilityLabel="Toggle wishlist"
            style={{ height: layout.footerButtonHeight }}
            className="items-center justify-center rounded-[14px] border border-app-border bg-app-surface px-4 active:opacity-80 dark:border-app-border-dark dark:bg-app-surface-dark">
            <Heart
              size={22}
              color={palette.green}
              fill={wishlisted ? palette.yellowGreen : 'transparent'}
              strokeWidth={2}
            />
          </Pressable>
          <Pressable
            onPress={() => void handleReadBook()}
            accessibilityRole="button"
            accessibilityLabel={`Read ${book.title}`}
            style={{
              height: layout.footerButtonHeight,
              backgroundColor: colors.primary,
              flex: 1,
            }}
            className="items-center justify-center rounded-[14px] active:opacity-90">
            <Text className="text-[16px] font-semibold text-white">
              {canAccessPremium ? 'Read book' : 'Unlock to read'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function BackLink({ onPress }: { onPress: () => void }) {
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

function DetailCell({ label, value }: { label: string; value: string }) {
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

function DetailRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
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
  },
  coverShadow: {
    shadowColor: '#0E1410',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
});
