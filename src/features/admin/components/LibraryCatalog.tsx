import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronDown, ChevronUp, Info } from 'lucide-react-native';

import { Icon, Label, Text } from '@/components/ui';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import { AdminMenuSkeleton } from '@/features/admin/components/AdminSkeletons';
import {
  ADMIN_GUTTER,
  AdminEmpty,
  AdminErrorState,
  AdminTag,
} from '@/features/admin/components/AdminUi';
import { useAppInsets } from '@/hooks/useAppInsets';
import {
  useAdminCategories,
  useAdminCollections,
  useReorderCatalog,
} from '@/hooks/useAdmin';
import {
  systemShelfNote,
  type AdminCategory,
  type AdminCollection,
} from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';
import { useStrings } from '@/i18n';
import { strings } from '@/i18n/strings';

/**
 * The two ordered catalog lists.
 *
 * Order here is not a preference, it is the reader's screen: categories are
 * the Explore row left to right, shelves are Home top to bottom. Both say so,
 * and both write the new order the moment a row moves — there is no separate
 * "save the order" step to forget.
 */

// ----------------------------------------------------------------- reorder

/**
 * Local order that follows the server but leads it while a row is moving.
 *
 * The new order is computed and written before state is set, never from inside
 * the updater — an updater can run twice, and a reorder that fires twice is a
 * second request racing the first.
 */
function useLocalOrder<T extends { id: string }>(data: T[]) {
  const [order, setOrder] = useState<T[]>(data);
  const latest = useRef(order);
  latest.current = order;
  const server = useRef(data);
  server.current = data;

  useEffect(() => {
    setOrder(data);
  }, [data]);

  /** Back to the server's order — a failed write must not stay on screen. */
  const revert = useCallback(() => {
    latest.current = server.current;
    setOrder(server.current);
  }, []);

  const move = useCallback(
    (index: number, delta: number, commit: (ids: string[]) => void) => {
      const current = latest.current;
      const target = index + delta;
      if (target < 0 || target >= current.length) {
        return;
      }
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);

      latest.current = next;
      setOrder(next);
      commit(next.map(item => item.id));
    },
    [],
  );

  return { order, move, revert };
}

const MoveControls = memo(function MoveControls({
  label,
  isFirst,
  isLast,
  onMove,
}: {
  label: string;
  isFirst: boolean;
  isLast: boolean;
  onMove: (delta: number) => void;
}) {
  const s = useStrings();
  return (
    <View style={styles.moveControls}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={s.admin.ui.moveUp(label)}
        disabled={isFirst}
        hitSlop={6}
        onPress={() => onMove(-1)}
        style={[styles.moveButton, isFirst && styles.disabled]}
      >
        <Icon icon={ChevronUp} size={16} tone="muted" strokeWidth={2.2} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={s.admin.ui.moveDown(label)}
        disabled={isLast}
        hitSlop={6}
        onPress={() => onMove(1)}
        style={[styles.moveButton, isLast && styles.disabled]}
      >
        <Icon icon={ChevronDown} size={16} tone="muted" strokeWidth={2.2} />
      </Pressable>
    </View>
  );
});

/** The green note that explains what the order does to readers. */
const OrderHint = memo(function OrderHint({ children }: { children: string }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.hint, { backgroundColor: colors.primaryFillSoft }]}>
      <Icon icon={Info} size={15} tone="action" strokeWidth={2} />
      <Text size={11.5} leading={1.45} tone="muted" style={styles.grow}>
        {children}
      </Text>
    </View>
  );
});

// --------------------------------------------------------------- categories

export const LibraryCategories = memo(function LibraryCategories({
  onOpen,
  onCreate,
}: {
  onOpen: (categoryId: string) => void;
  onCreate: () => void;
}) {
  const s = useStrings();
  const { scrollEndPadding } = useAppInsets();
  const toast = useToast();

  const { data = [], isLoading, error, refetch } = useAdminCategories();
  const reorder = useReorderCatalog();
  const { order, move, revert } = useLocalOrder(data);

  const commit = useCallback(
    (ids: string[]) =>
      reorder.mutate(
        { table: 'categories', ids },
        {
          onError: caught => {
            revert();
            toast.error(errorMessage(caught));
          },
        },
      ),
    [reorder, revert, toast],
  );

  if (isLoading) {
    return (
      <View style={styles.gutter}>
        <AdminMenuSkeleton count={5} height={60} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.gutter}>
        <AdminErrorState
          message={s.adminLibrary.catalog.categoriesFailed}
          detail={errorMessage(error)}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  if (order.length === 0) {
    return (
      <ScrollView style={styles.fill} contentContainerStyle={styles.gutter}>
        <AdminEmpty
          title={s.adminLibrary.catalog.noCategories}
          message={s.adminLibrary.catalog.noCategoriesMessage}
          actionLabel={s.adminLibrary.catalog.addFirstCategory}
          onAction={onCreate}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[
        styles.list,
        { paddingBottom: scrollEndPadding + 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {order.map((category, index) => (
        <CategoryRow
          key={category.id}
          category={category}
          index={index}
          isFirst={index === 0}
          isLast={index === order.length - 1}
          onMove={delta => move(index, delta, commit)}
          onPress={() => onOpen(category.id)}
        />
      ))}

      <OrderHint>{s.adminLibrary.catalog.categoryOrderHint}</OrderHint>

      {reorder.isPending ? (
        <Label size={10} tracking={1.6} tone="dim" style={styles.saving}>
          {s.adminLibrary.catalog.savingOrder}
        </Label>
      ) : null}
    </ScrollView>
  );
});

const CategoryRow = memo(function CategoryRow({
  category,
  isFirst,
  isLast,
  onMove,
  onPress,
}: {
  category: AdminCategory;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (delta: number) => void;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const s = useStrings();

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.swatch,
          { backgroundColor: category.accent ?? colors.primary },
        ]}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={category.label}
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <Text size={14} leading={1.2} numberOfLines={1}>
          {category.label}
        </Text>
        <Text size={11} leading={1.2} tone="faint" numberOfLines={1}>
          {`${category.icon_key} · ${category.slug}`}
        </Text>
      </Pressable>

      <MoveControls
        label={category.label}
        isFirst={isFirst}
        isLast={isLast}
        onMove={onMove}
      />

      {category.book_count === 0 ? (
        <AdminTag label={s.adminLibrary.catalog.empty} tone="warning" />
      ) : (
        <Text size={11} leading={1} tone="faint">
          {s.adminLibrary.counts.books(category.book_count)}
        </Text>
      )}
    </View>
  );
});

// ------------------------------------------------------------------ shelves

export const LibraryShelves = memo(function LibraryShelves({
  onOpen,
  onCreate,
}: {
  onOpen: (collectionId: string) => void;
  onCreate: () => void;
}) {
  const s = useStrings();
  const { scrollEndPadding } = useAppInsets();
  const toast = useToast();

  const { data = [], isLoading, error, refetch } = useAdminCollections();
  const reorder = useReorderCatalog();
  const { order, move, revert } = useLocalOrder(data);

  const commit = useCallback(
    (ids: string[]) =>
      reorder.mutate(
        { table: 'collections', ids },
        {
          onError: caught => {
            revert();
            toast.error(errorMessage(caught));
          },
        },
      ),
    [reorder, revert, toast],
  );

  if (isLoading) {
    return (
      <View style={styles.gutter}>
        <AdminMenuSkeleton count={5} height={62} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.gutter}>
        <AdminErrorState
          message={s.adminLibrary.catalog.shelvesFailed}
          detail={errorMessage(error)}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  if (order.length === 0) {
    return (
      <ScrollView style={styles.fill} contentContainerStyle={styles.gutter}>
        <AdminEmpty
          title={s.adminLibrary.catalog.noCollections}
          message={s.adminLibrary.catalog.noCollectionsMessage}
          actionLabel={s.adminLibrary.catalog.addFirstCollection}
          onAction={onCreate}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[
        styles.list,
        { paddingBottom: scrollEndPadding + 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {order.map((collection, index) => (
        <ShelfRow
          key={collection.id}
          collection={collection}
          position={index + 1}
          isFirst={index === 0}
          isLast={index === order.length - 1}
          onMove={delta => move(index, delta, commit)}
          onPress={() => onOpen(collection.id)}
        />
      ))}

      <OrderHint>{s.adminLibrary.catalog.collectionOrderHint}</OrderHint>
    </ScrollView>
  );
});

/**
 * The second line of a collection row.
 *
 * A Home rail says which rail it is. Anything else says how many books
 * readers will find on it — and, when that differs from what the admin put
 * there, how many are drafts waiting to be published.
 */
function collectionDetail(collection: AdminCollection): string {
  const words = strings().adminLibrary;
  if (collection.is_system) {
    const note = systemShelfNote(collection.slug);
    const rail = note?.label ?? words.shelfNotes.homeRail;
    if (!note?.curated) {
      return words.catalog.drawnWeekly(rail);
    }
    return collection.book_count === 0
      ? words.catalog.newestStandIn(rail)
      : words.catalog.railLive(rail, collection.published_count);
  }
  const live = words.counts.books(collection.published_count);
  const drafts = collection.book_count - collection.published_count;
  return drafts > 0 ? words.catalog.inDraft(live, drafts) : live;
}

const ShelfRow = memo(function ShelfRow({
  collection,
  position,
  isFirst,
  isLast,
  onMove,
  onPress,
}: {
  collection: AdminCollection;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (delta: number) => void;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const s = useStrings();
  const hidden = !collection.is_published;
  // Empty means empty for readers: a shelf of drafts is not on Home. The two
  // system shelves that stand in newest books are never empty on Home.
  const standsIn =
    collection.is_system &&
    (systemShelfNote(collection.slug)?.curated === false ||
      collection.slug === 'home-hero' ||
      collection.slug === 'new-arrivals');
  const empty = collection.published_count === 0 && !standsIn;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
        hidden && styles.dimmed,
      ]}
    >
      <Label
        size={10}
        leading={1}
        weight="700"
        tracking={0}
        tone="dim"
        style={styles.position}
      >
        {String(position)}
      </Label>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={collection.title}
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <Text size={14} leading={1.2} numberOfLines={1}>
          {collection.title}
        </Text>
        <Text size={11} leading={1.2} tone="faint" numberOfLines={1}>
          {collectionDetail(collection)}
        </Text>
      </Pressable>

      <MoveControls
        label={collection.title}
        isFirst={isFirst}
        isLast={isLast}
        onMove={onMove}
      />

      {hidden ? (
        <AdminTag label={s.adminLibrary.catalog.hidden} tone="neutral" />
      ) : empty ? (
        <AdminTag label={s.adminLibrary.catalog.empty} tone="warning" />
      ) : collection.is_system ? (
        <AdminTag label={s.adminLibrary.catalog.rail} tone="success" />
      ) : (
        <AdminTag label={s.adminLibrary.catalog.live} tone="success" />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  gutter: {
    paddingHorizontal: ADMIN_GUTTER,
  },
  list: {
    paddingHorizontal: ADMIN_GUTTER,
    gap: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  dimmed: {
    opacity: 0.6,
  },
  position: {
    width: 14,
    textAlign: 'center',
  },
  swatch: {
    width: 5,
    height: 34,
    borderRadius: 3,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  moveControls: {
    flexDirection: 'row',
  },
  moveButton: {
    padding: 3,
  },
  disabled: {
    opacity: 0.25,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  saving: {
    textAlign: 'center',
    paddingTop: 4,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.6,
  },
});
