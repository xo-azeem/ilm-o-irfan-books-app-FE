import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';

import {
  Drawer,
  Icon,
  Label,
  SearchField,
  SkeletonBone,
  SkeletonPulse,
  Text,
  TextButton,
} from '@/components/ui';
import { useStrings } from '@/i18n';
import type { CatalogCategory, CatalogCollection } from '@/services/catalog';
import { radius } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize } from '@/theme/typography';

/** One line of the drawer: a category to filter by, or a collection to open. */
type BrowseRowItem =
  | {
      kind: 'category';
      id: string;
      label: string;
      count: number;
      accent: string;
    }
  | {
      kind: 'collection';
      id: string;
      label: string;
      count: number;
      accent: string;
    };

type BrowseSection = {
  key: 'categories' | 'collections';
  title: string;
  data: BrowseRowItem[];
};

export type BrowseDrawerProps = {
  visible: boolean;
  onClose: () => void;
  categories: CatalogCategory[];
  collections: CatalogCollection[];
  /** The first read of either list is still on its way. */
  isPending: boolean;
  /** Either read failed and there is nothing cached to show. */
  isError: boolean;
  /** The category currently filtering Discover, from `useSearchFilters`. */
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onOpenCollection: (id: string) => void;
};

/** Diacritic-insensitive, case-insensitive: "tafsir" finds "Tafsīr". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}

const keyExtractor = (item: BrowseRowItem) => `${item.kind}:${item.id}`;

/**
 * Every category and every collection, in a panel from the left edge.
 *
 * The lists are the admin's and can be any length, so they are virtualised
 * and searched rather than laid out in full: a search field at the top
 * narrows both sections as the reader types. Picking a category is the same
 * filter the sheet and the chip row work on — the drawer writes
 * `categoryId` and reads its selection back from it, and owns no state of
 * its own beyond the search text. Picking a collection opens its page.
 *
 * Both lists come from the catalogue's reference reads, already cached for
 * Discover and Home, so opening the drawer costs no request of its own.
 */
export const BrowseDrawer = memo(function BrowseDrawer({
  visible,
  onClose,
  categories,
  collections,
  isPending,
  isError,
  selectedCategoryId,
  onSelectCategory,
  onOpenCollection,
}: BrowseDrawerProps) {
  const s = useStrings();
  const words = s.catalog.browse;
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  // A fresh search every time the drawer opens; a term left from last time
  // would hide most of the list with nothing to say why.
  useEffect(() => {
    if (!visible) {
      setQuery('');
    }
  }, [visible]);

  const sections = useMemo<BrowseSection[]>(() => {
    const needle = fold(query.trim());
    const matches = (label: string) => !needle || fold(label).includes(needle);

    const categoryRows: BrowseRowItem[] = categories
      .filter(category => matches(category.label))
      .map(category => ({
        kind: 'category',
        id: category.id,
        label: category.label,
        count: Number(category.count) || 0,
        accent: category.accent,
      }));
    const collectionRows: BrowseRowItem[] = collections
      .filter(collection => matches(collection.title))
      .map(collection => ({
        kind: 'collection',
        id: collection.id,
        label: collection.title,
        count: collection.bookCount,
        accent: collection.accent,
      }));

    const result: BrowseSection[] = [];
    if (categoryRows.length > 0) {
      result.push({
        key: 'categories',
        title: words.categories,
        data: categoryRows,
      });
    }
    if (collectionRows.length > 0) {
      result.push({
        key: 'collections',
        title: words.collections,
        data: collectionRows,
      });
    }
    return result;
  }, [categories, collections, query, words.categories, words.collections]);

  const handlePress = useCallback(
    (item: BrowseRowItem) => {
      if (item.kind === 'category') {
        // Tapping the selected category again clears it — the drawer is the
        // one place the filter can be both set and unset in a tap.
        onSelectCategory(item.id === selectedCategoryId ? null : item.id);
      } else {
        onOpenCollection(item.id);
      }
      onClose();
    },
    [onClose, onOpenCollection, onSelectCategory, selectedCategoryId],
  );

  const clearCategory = useCallback(() => {
    onSelectCategory(null);
    onClose();
  }, [onClose, onSelectCategory]);

  const renderItem = useCallback(
    ({ item }: { item: BrowseRowItem }) => (
      <BrowseRow
        item={item}
        selected={item.kind === 'category' && item.id === selectedCategoryId}
        onPress={handlePress}
      />
    ),
    [handlePress, selectedCategoryId],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: BrowseSection }) => (
      <View style={[styles.sectionHeader, { backgroundColor: colors.surface }]}>
        <Label>{section.title}</Label>
        {section.key === 'categories' && selectedCategoryId ? (
          <TextButton
            label={s.catalog.discover.allSubjects}
            tone="muted"
            onPress={clearCategory}
          />
        ) : null}
      </View>
    ),
    [
      clearCategory,
      colors.surface,
      s.catalog.discover.allSubjects,
      selectedCategoryId,
    ],
  );

  const hasAnything = categories.length > 0 || collections.length > 0;

  return (
    <Drawer visible={visible} onClose={onClose} title={words.title}>
      <View style={styles.body}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={words.searchPlaceholder}
          dense
          autoCorrect={false}
        />

        {isPending && !hasAnything ? (
          <BrowseSkeleton />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled
            ItemSeparatorComponent={RowGap}
            SectionSeparatorComponent={SectionGap}
            ListEmptyComponent={
              <Text
                size={fontSize.bodySmall}
                leading={1.6}
                tone="muted"
                align="center"
                style={styles.empty}
              >
                {isError && !hasAnything
                  ? words.couldNotLoad
                  : hasAnything
                    ? words.nothingMatched
                    : words.empty}
              </Text>
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            initialNumToRender={16}
            windowSize={7}
            style={styles.grow}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </Drawer>
  );
});

const BrowseRow = memo(function BrowseRow({
  item,
  selected,
  onPress,
}: {
  item: BrowseRowItem;
  selected: boolean;
  onPress: (item: BrowseRowItem) => void;
}) {
  const s = useStrings();
  const { colors } = useTheme();
  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? colors.selected : colors.surfaceAlt,
          borderColor: selected ? colors.selectedBorder : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.swatch, { backgroundColor: item.accent }]} />
      <View style={styles.rowBody}>
        <Text
          size={fontSize.bodySmall}
          leading={1.25}
          weight="500"
          numberOfLines={1}
        >
          {item.label}
        </Text>
        <Text size={11.5} leading={1} tone="faint" numberOfLines={1}>
          {s.common.bookCount(item.count)}
        </Text>
      </View>
      {selected ? (
        <Icon icon={Check} size={16} tone="primary" />
      ) : item.kind === 'collection' ? (
        <Icon icon={ChevronRight} size={16} tone="faint" />
      ) : null}
    </Pressable>
  );
});

/** Stands in for the two lists on their first read. */
const BrowseSkeleton = memo(function BrowseSkeleton() {
  return (
    <SkeletonPulse>
      <View style={styles.skeleton}>
        <SkeletonBone width={80} height={10} radius={5} />
        {Array.from({ length: 7 }, (_, index) => (
          <SkeletonBone
            key={index}
            height={52}
            radius={radius.control}
            shimmer={index === 0}
          />
        ))}
      </View>
    </SkeletonPulse>
  );
});

function RowGap() {
  return <View style={styles.rowGap} />;
}

function SectionGap() {
  return <View style={styles.sectionGap} />;
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 14,
  },
  grow: {
    flex: 1,
  },
  list: {
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  swatch: {
    width: 10,
    height: 28,
    borderRadius: 5,
  },
  pressed: {
    opacity: 0.72,
  },
  rowGap: {
    height: 8,
  },
  sectionGap: {
    height: 10,
  },
  empty: {
    paddingTop: 28,
  },
  skeleton: {
    gap: 8,
  },
});
