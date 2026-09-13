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
  SYSTEM_SHELF_NOTE,
  type AdminCategory,
  type AdminCollection,
} from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

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

  useEffect(() => {
    setOrder(data);
  }, [data]);

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

  return { order, move };
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
  return (
    <View style={styles.moveControls}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Move ${label} up`}
        disabled={isFirst}
        hitSlop={6}
        onPress={() => onMove(-1)}
        style={[styles.moveButton, isFirst && styles.disabled]}
      >
        <Icon icon={ChevronUp} size={16} tone="muted" strokeWidth={2.2} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Move ${label} down`}
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
  const { scrollEndPadding } = useAppInsets();
  const toast = useToast();

  const { data = [], isLoading, error, refetch } = useAdminCategories();
  const reorder = useReorderCatalog();
  const { order, move } = useLocalOrder(data);

  const commit = useCallback(
    (ids: string[]) =>
      reorder.mutate(
        { table: 'categories', ids },
        { onError: caught => toast.error(errorMessage(caught)) },
      ),
    [reorder, toast],
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
          message="The category list could not be loaded."
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
          title="No categories yet"
          message="Categories are the tiles on Explore and the filters in search. Add the first one and books can be tagged with it."
          actionLabel="Add the first category"
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

      <OrderHint>
        Move a category and readers see the new Explore order immediately.
        Hidden categories still work as search filters.
      </OrderHint>

      {reorder.isPending ? (
        <Label size={10} tracking={1.6} tone="dim" style={styles.saving}>
          Saving order…
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
        <AdminTag label="EMPTY" tone="warning" />
      ) : (
        <Text size={11} leading={1} tone="faint">
          {`${category.book_count} books`}
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
  const { scrollEndPadding } = useAppInsets();
  const toast = useToast();

  const { data = [], isLoading, error, refetch } = useAdminCollections();
  const reorder = useReorderCatalog();
  const { order, move } = useLocalOrder(data);

  const commit = useCallback(
    (ids: string[]) =>
      reorder.mutate(
        { table: 'collections', ids },
        { onError: caught => toast.error(errorMessage(caught)) },
      ),
    [reorder, toast],
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
          message="The shelf list could not be loaded."
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
          title="No collections yet"
          message="A collection is a card on Home's curated strip that opens a reading list. Add one, put a few titles in it, and it appears the moment you publish it."
          actionLabel="Add the first collection"
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

      <OrderHint>
        Move a collection and readers see the new order on Home immediately. A
        hidden collection stays linkable but disappears from Home. The three
        Home rails are listed here so they can be retitled or hidden; they
        cannot be deleted.
      </OrderHint>
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
  if (collection.is_system) {
    const rail = SYSTEM_SHELF_NOTE[collection.slug]?.label ?? 'Home rail';
    if (!SYSTEM_SHELF_NOTE[collection.slug]?.curated) {
      return `${rail} · drawn weekly`;
    }
    return collection.book_count === 0
      ? `${rail} · newest books stand in`
      : `${rail} · ${collection.published_count} live`;
  }
  const live = `${collection.published_count} ${
    collection.published_count === 1 ? 'book' : 'books'
  }`;
  const drafts = collection.book_count - collection.published_count;
  return drafts > 0 ? `${live} · ${drafts} in draft` : live;
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
  const hidden = !collection.is_published;
  // Empty means empty for readers: a shelf of drafts is not on Home. The two
  // system shelves that stand in newest books are never empty on Home.
  const standsIn =
    collection.is_system &&
    (SYSTEM_SHELF_NOTE[collection.slug]?.curated === false ||
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
        <AdminTag label="HIDDEN" tone="neutral" />
      ) : empty ? (
        <AdminTag label="EMPTY" tone="warning" />
      ) : collection.is_system ? (
        <AdminTag label="RAIL" tone="success" />
      ) : (
        <AdminTag label="LIVE" tone="success" />
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
