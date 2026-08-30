import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SkeletonBone, SkeletonCover, SkeletonPulse, SkeletonRail } from '@/components/ui';
import { layout, radius } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Skeletons mirror the real layout exactly — same cover ratios, same rails — so
 * the page does not reflow when data lands. Only the lead element in each
 * section shimmers; a screen where everything moves reads as noise.
 */

export const HomeCatalogSkeleton = memo(function HomeCatalogSkeleton() {
  const { colors } = useTheme();

  return (
    <SkeletonPulse>
      <View style={styles.root}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <SkeletonBone width={120} height={11} radius={6} shimmer />
            <SkeletonBone width={196} height={17} radius={8} shimmer />
          </View>
          <SkeletonBone width={38} height={38} radius={19} />
        </View>

        {/* Hero card */}
        <View
          style={[
            styles.hero,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          ]}>
          <View style={styles.heroTop}>
            <SkeletonCover width={112} shimmer />
            <View style={styles.heroText}>
              <SkeletonBone width={88} height={9} radius={5} />
              <SkeletonBone height={20} radius={8} shimmer />
              <SkeletonBone width="70%" height={20} radius={8} />
              <SkeletonBone width={120} height={11} radius={6} />
            </View>
          </View>
          <SkeletonBone height={11} radius={6} />
          <SkeletonBone width="82%" height={11} radius={6} />
          <View style={styles.heroActions}>
            <SkeletonBone height={48} radius={14} style={styles.grow} />
            <SkeletonBone width={48} height={48} radius={14} />
          </View>
        </View>

        <SkeletonBone width={150} height={16} radius={8} />
        <View style={styles.continueRow}>
          <SkeletonBone width={258} height={98} radius={radius.card} shimmer />
          <SkeletonBone width={258} height={98} radius={radius.card} />
        </View>

        <SkeletonBone width={120} height={16} radius={8} />
        <SkeletonRail count={3} width={120} />
      </View>
    </SkeletonPulse>
  );
});

/** The Discover / search-results skeleton: a grid rather than rails. */
export const CatalogGridSkeleton = memo(function CatalogGridSkeleton({
  count = 6,
  columns = 3,
  itemWidth = 100,
}: {
  count?: number;
  columns?: number;
  itemWidth?: number;
}) {
  return (
    <SkeletonPulse>
      <View style={[styles.grid, { gap: 13 }]}>
        {Array.from({ length: count }, (_, index) => (
          <SkeletonCover
            key={index}
            width={itemWidth}
            shimmer={index < columns}
          />
        ))}
      </View>
    </SkeletonPulse>
  );
});

/** A stack of list rows — search results, downloads, admin lists. */
export const ListSkeleton = memo(function ListSkeleton({
  count = 4,
  coverWidth = 62,
}: {
  count?: number;
  coverWidth?: number;
}) {
  return (
    <SkeletonPulse>
      <View style={styles.list}>
        {Array.from({ length: count }, (_, index) => (
          <View key={index} style={styles.listRow}>
            <SkeletonCover width={coverWidth} shimmer={index === 0} />
            <View style={styles.listBody}>
              <SkeletonBone width="72%" height={15} radius={7} shimmer={index === 0} />
              <SkeletonBone width="46%" height={11} radius={6} />
              <SkeletonBone width={90} height={10} radius={5} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
});

/** The library shelf: a resume card above a three-column grid of covers. */
export const LibraryCatalogSkeleton = memo(function LibraryCatalogSkeleton({
  itemWidth = 100,
}: {
  itemWidth?: number;
}) {
  return (
    <SkeletonPulse>
      <View style={styles.root}>
        <SkeletonBone height={118} radius={radius.cardLarge} shimmer />
        <View style={[styles.grid, { gap: 13 }]}>
          {Array.from({ length: 6 }, (_, index) => (
            <View key={index} style={{ width: itemWidth, gap: 8 }}>
              <SkeletonCover width={itemWidth} shimmer={index < 3} />
              <SkeletonBone width="80%" height={12} radius={6} />
            </View>
          ))}
        </View>
      </View>
    </SkeletonPulse>
  );
});

/** The finished / downloads tab: rows rather than a grid. */
export const LibraryFinishedSkeleton = memo(function LibraryFinishedSkeleton() {
  return <ListSkeleton count={4} coverWidth={48} />;
});

export const DownloadsCatalogSkeleton = memo(function DownloadsCatalogSkeleton() {
  return (
    <SkeletonPulse>
      <View style={styles.root}>
        <SkeletonBone height={96} radius={radius.card} shimmer />
        <ListSkeleton count={4} coverWidth={48} />
      </View>
    </SkeletonPulse>
  );
});

/** The book detail hero: a centred cover, title block and stat strip. */
export const BookDetailSkeleton = memo(function BookDetailSkeleton() {
  return (
    <SkeletonPulse>
      <View style={styles.detail}>
        <SkeletonCover width={158} shimmer />
        <SkeletonBone width={240} height={24} radius={10} shimmer />
        <SkeletonBone width={140} height={14} radius={7} />
        <SkeletonBone width={180} height={22} radius={9} />
        <SkeletonBone height={64} radius={12} />
        <SkeletonBone height={11} radius={6} />
        <SkeletonBone width="86%" height={11} radius={6} />
        <View style={styles.detailActions}>
          <SkeletonBone height={52} radius={15} style={styles.grow} />
          <SkeletonBone height={52} radius={15} style={styles.grow} />
        </View>
      </View>
    </SkeletonPulse>
  );
});

/** The admin overview's tile grids. */
export const AdminStatsSkeleton = memo(function AdminStatsSkeleton() {
  return (
    <SkeletonPulse>
      <View style={styles.root}>
        <SkeletonBone height={62} radius={radius.button} shimmer />
        <View style={styles.tileRow}>
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonBone key={index} height={70} radius={14} style={styles.grow} shimmer={index === 0} />
          ))}
        </View>
        <View style={styles.tileRow}>
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonBone key={index} height={62} radius={14} style={styles.grow} />
          ))}
        </View>
        <SkeletonBone height={140} radius={radius.button} />
      </View>
    </SkeletonPulse>
  );
});

/** A plain stack of rows for the admin lists. */
export const ListRowsSkeleton = memo(function ListRowsSkeleton({
  count = 5,
  height = 74,
}: {
  count?: number;
  height?: number;
}) {
  return (
    <SkeletonPulse>
      <View style={styles.rows}>
        {Array.from({ length: count }, (_, index) => (
          <SkeletonBone key={index} height={height} radius={14} shimmer={index === 0} />
        ))}
      </View>
    </SkeletonPulse>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: 22,
  },
  detail: {
    alignItems: 'center',
    gap: 14,
    alignSelf: 'stretch',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  tileRow: {
    flexDirection: 'row',
    gap: 9,
  },
  rows: {
    gap: 9,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    gap: 8,
  },
  hero: {
    borderRadius: radius.hero,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 20,
    gap: 16,
  },
  heroTop: {
    flexDirection: 'row',
    gap: 16,
  },
  heroText: {
    flex: 1,
    gap: 10,
    paddingTop: 6,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
  },
  grow: {
    flex: 1,
  },
  continueRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: -layout.screenPadding,
    paddingHorizontal: layout.screenPadding,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  list: {
    gap: 14,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  listBody: {
    flex: 1,
    gap: 7,
  },
});
