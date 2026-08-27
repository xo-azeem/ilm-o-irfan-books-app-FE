import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DisplayText } from '@/components/ui';
import { SkeletonBone, SkeletonPulse } from '@/components/ui/Skeleton';
import { ExploreSectionHeader } from '@/features/explore/components/ExploreSectionHeader';
import { useSearchGridMetrics } from '@/features/search/hooks/useSearchGridMetrics';

const COVER_W_RATIO = 0.46;
const COVER_ASPECT = 1.48;
const PANEL_HEIGHT = 206;
const CARD_WIDTH = 128;

function CoverCardSkeleton({
  width = CARD_WIDTH,
  coverAspect = 1.45,
}: {
  width?: number;
  coverAspect?: number;
}) {
  const coverH = width * coverAspect;
  return (
    <View style={{ width }}>
      <SkeletonBone width={width} height={coverH} radius={12} />
      <View className="mt-2.5 gap-1.5">
        <SkeletonBone width="88%" height={14} radius={6} />
        <SkeletonBone width="64%" height={12} radius={6} />
        <SkeletonBone width={36} height={12} radius={6} />
      </View>
    </View>
  );
}

function CoverRowSkeleton({
  count = 4,
  width = CARD_WIDTH,
}: {
  count?: number;
  width?: number;
}) {
  return (
    <ScrollView
      horizontal
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-4 pr-5">
      {Array.from({ length: count }, (_, index) => (
        <CoverCardSkeleton key={index} width={width} />
      ))}
    </ScrollView>
  );
}

function CollectionCardSkeleton() {
  return (
    <View className="min-w-[260px] rounded-2xl border border-app-border bg-app-surface p-4 dark:border-app-border-dark dark:bg-app-surface-dark">
      <SkeletonBone width={32} height={2} radius={1} style={{ marginBottom: 12 }} />
      <SkeletonBone width="70%" height={16} radius={6} style={{ marginBottom: 8 }} />
      <SkeletonBone width="92%" height={12} radius={6} style={{ marginBottom: 6 }} />
      <SkeletonBone width="54%" height={12} radius={6} style={{ marginBottom: 12 }} />
      <SkeletonBone width={88} height={12} radius={6} />
    </View>
  );
}

function HeroCarouselSkeleton() {
  const { width: windowWidth } = useWindowDimensions();
  const coverWidth = Math.round(Math.max(windowWidth, 1) * COVER_W_RATIO);
  const coverHeight = Math.round(coverWidth * COVER_ASPECT);

  return (
    <View className="items-center pb-2">
      <SkeletonBone width={coverWidth} height={coverHeight} radius={14} />
      <View className="mt-2.5 flex-row items-center gap-1.5">
        <SkeletonBone width={18} height={5} radius={3} />
        <SkeletonBone width={5} height={5} radius={3} />
        <SkeletonBone width={5} height={5} radius={3} />
      </View>
      <View className="mt-4 w-full px-5" style={{ minHeight: PANEL_HEIGHT - 40 }}>
        <SkeletonBone width="38%" height={10} radius={5} style={{ marginBottom: 10 }} />
        <SkeletonBone width="72%" height={20} radius={7} style={{ marginBottom: 8 }} />
        <SkeletonBone width="44%" height={12} radius={6} style={{ marginBottom: 12 }} />
        <SkeletonBone width="100%" height={12} radius={6} style={{ marginBottom: 6 }} />
        <SkeletonBone width="86%" height={12} radius={6} style={{ marginBottom: 16 }} />
        <View className="flex-row justify-between">
          <SkeletonBone width={140} height={44} radius={12} />
          <SkeletonBone width={44} height={44} radius={12} />
        </View>
      </View>
    </View>
  );
}

export function HomeCatalogSkeleton() {
  return (
    <SkeletonPulse>
      <HeroCarouselSkeleton />
      <View className="px-5 pt-2">
        <View className="mb-8">
          <ExploreSectionHeader title="Trending now" subtitle="Most read this week" />
          <CoverRowSkeleton />
        </View>
        <View className="mb-8">
          <ExploreSectionHeader title="New arrivals" subtitle="Fresh on the shelf" />
          <CoverRowSkeleton />
        </View>
        <View className="mb-4">
          <ExploreSectionHeader
            title="Curated collections"
            subtitle="Hand-picked reading lists"
          />
          <ScrollView
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 pr-5">
            <CollectionCardSkeleton />
            <CollectionCardSkeleton />
          </ScrollView>
        </View>
      </View>
    </SkeletonPulse>
  );
}

export function BookDetailSkeleton() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const horizontalPadding = Math.max(20, Math.round(screenWidth * 0.05));
  const maxCoverHeight = screenHeight * 0.25;
  const coverWidth = Math.min(
    screenWidth - horizontalPadding * 2,
    maxCoverHeight / 1.42,
    screenWidth * 0.44,
  );
  const coverHeight = coverWidth * 1.42;
  const footerBottom = Math.max(insets.bottom, 10);

  return (
    <SkeletonPulse>
      <View className="flex-1 bg-app-bg dark:bg-app-bg-dark">
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: horizontalPadding,
            paddingBottom: 20,
            alignItems: 'center',
          }}>
          <SkeletonBone
            width={72}
            height={16}
            radius={8}
            style={{ alignSelf: 'flex-start', marginBottom: 16 }}
          />
          <SkeletonBone width={coverWidth} height={coverHeight} radius={20} />
        </View>
        <View className="flex-1" style={{ paddingHorizontal: horizontalPadding, paddingTop: 20 }}>
          <SkeletonBone width={88} height={24} radius={12} />
          <SkeletonBone width="82%" height={28} radius={8} style={{ marginTop: 14 }} />
          <SkeletonBone width="48%" height={18} radius={7} style={{ marginTop: 8 }} />
          <View className="mt-6 flex-row justify-between">
            <SkeletonBone width={100} height={40} radius={8} />
            <SkeletonBone width={72} height={40} radius={8} />
          </View>
          <View className="mt-6 flex-row" style={{ gap: 10 }}>
            <SkeletonBone width="48%" height={64} radius={14} />
            <SkeletonBone width="48%" height={64} radius={14} />
          </View>
          <SkeletonBone width="100%" height={12} radius={6} style={{ marginTop: 28 }} />
          <SkeletonBone width="100%" height={12} radius={6} style={{ marginTop: 8 }} />
          <SkeletonBone width="74%" height={12} radius={6} style={{ marginTop: 8 }} />
        </View>
        <View
          className="flex-row border-t border-app-border dark:border-app-border-dark"
          style={{
            gap: 10,
            paddingTop: 12,
            paddingBottom: footerBottom,
            paddingHorizontal: horizontalPadding,
          }}>
          <SkeletonBone width="48%" height={50} radius={14} />
          <SkeletonBone width="48%" height={50} radius={14} />
        </View>
      </View>
    </SkeletonPulse>
  );
}

function LibraryHeading({ title }: { title: string }) {
  return (
    <View className="mb-3">
      <DisplayText className="text-[20px] font-semibold tracking-tight text-app-ink dark:text-app-ink-dark">
        {title}
      </DisplayText>
    </View>
  );
}

export function LibraryCatalogSkeleton() {
  return (
    <SkeletonPulse>
      <View className="mb-8">
        <LibraryHeading title="In progress" />
        <View className="overflow-hidden rounded-[16px] bg-app-surface dark:bg-app-surface-dark">
          {Array.from({ length: 3 }, (_, index) => (
            <View key={index} className="flex-row items-start gap-3.5 px-6 py-5">
              <SkeletonBone width={68} height={99} radius={10} />
              <View className="min-w-0 flex-1 gap-2">
                <SkeletonBone width="78%" height={16} radius={6} />
                <SkeletonBone width="52%" height={13} radius={6} />
                <SkeletonBone width="40%" height={12} radius={6} />
                <SkeletonBone width="100%" height={6} radius={3} style={{ marginTop: 8 }} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </SkeletonPulse>
  );
}

export function LibraryFinishedSkeleton() {
  return (
    <SkeletonPulse>
      <View className="mb-2">
        <LibraryHeading title="Recently finished" />
        <CoverRowSkeleton count={3} width={96} />
      </View>
    </SkeletonPulse>
  );
}

export function ListRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <SkeletonPulse>
      <View className="overflow-hidden rounded-[16px] bg-app-surface dark:bg-app-surface-dark">
        {Array.from({ length: rows }, (_, index) => (
          <View key={index} className="flex-row items-center gap-3 px-4 py-3.5">
            <SkeletonBone width={36} height={36} radius={10} />
            <View className="min-w-0 flex-1 gap-2">
              <SkeletonBone width="72%" height={14} radius={6} />
              <SkeletonBone width="46%" height={12} radius={6} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}

export function SearchCatalogSkeleton({
  viewMode = 'grid',
}: {
  viewMode?: 'grid' | 'list';
}) {
  const { cardWidth, coverHeight, bodyHeight, columnGap, rowGap } =
    useSearchGridMetrics();

  if (viewMode === 'list') {
    return (
      <SkeletonPulse>
        <View className="overflow-hidden rounded-[16px] bg-app-surface px-4 dark:bg-app-surface-dark">
          {Array.from({ length: 5 }, (_, index) => (
            <View key={index} className="flex-row items-start gap-4 py-4">
              <SkeletonBone width={76} height={100} radius={12} />
              <View className="min-w-0 flex-1 gap-2 pt-1">
                <SkeletonBone width="82%" height={16} radius={6} />
                <SkeletonBone width="48%" height={14} radius={6} />
                <SkeletonBone width="94%" height={12} radius={6} />
              </View>
            </View>
          ))}
        </View>
      </SkeletonPulse>
    );
  }

  return (
    <SkeletonPulse>
      <View className="flex-row flex-wrap" style={{ columnGap, rowGap }}>
        {Array.from({ length: 6 }, (_, index) => (
          <View
            key={index}
            style={{ width: cardWidth }}
            className="overflow-hidden rounded-[16px] bg-app-surface dark:bg-app-surface-dark">
            <SkeletonBone width={cardWidth} height={coverHeight} radius={0} />
            <View style={{ height: bodyHeight, paddingHorizontal: 14, paddingTop: 12, gap: 8 }}>
              <SkeletonBone width="90%" height={14} radius={6} />
              <SkeletonBone width="58%" height={12} radius={6} />
              <SkeletonBone width="80%" height={12} radius={6} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}

export function AdminStatsSkeleton() {
  return (
    <SkeletonPulse>
      <View className="flex-row flex-wrap gap-3">
        {Array.from({ length: 8 }, (_, index) => (
          <View
            key={index}
            className="min-w-[46%] flex-1 rounded-[16px] bg-app-surface p-4 dark:bg-app-surface-dark">
            <SkeletonBone width="58%" height={12} radius={6} />
            <SkeletonBone width={56} height={28} radius={8} style={{ marginTop: 12 }} />
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}

export function DownloadsCatalogSkeleton() {
  return (
    <SkeletonPulse>
      <View className="gap-7">
        <View className="h-[78px] overflow-hidden rounded-[14px] bg-app-surface dark:bg-app-surface-dark">
          <View className="flex-1 flex-row items-center gap-3 px-4">
            <SkeletonBone width={36} height={36} radius={10} />
            <View className="flex-1 gap-2">
              <SkeletonBone width={72} height={18} radius={6} />
              <SkeletonBone width={88} height={12} radius={6} />
            </View>
          </View>
        </View>
        <View className="overflow-hidden rounded-[14px] bg-app-surface dark:bg-app-surface-dark">
          {Array.from({ length: 3 }, (_, index) => (
            <View key={index} className="flex-row items-start gap-3.5 px-4 py-4">
              <SkeletonBone width={64} height={93} radius={10} />
              <View className="min-w-0 flex-1 gap-2 pt-0.5">
                <SkeletonBone width="78%" height={16} radius={6} />
                <SkeletonBone width="48%" height={13} radius={6} />
                <SkeletonBone width={64} height={12} radius={6} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </SkeletonPulse>
  );
}
