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
import { useAdminCategories, useAdminCollections, useReorderCatalog } from '@/hooks/useAdmin';
import type { AdminCategory, AdminCollection } from '@/services/admin';
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
        style={[styles.moveButton, isFirst && styles.disabled]}>
        <Icon icon={ChevronUp} size={16} tone="muted" strokeWidth={2.2} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Move ${label} down`}
        disabled={isLast}
        hitSlop={6}
        onPress={() => onMove(1)}
        style={[styles.moveButton, isLast && styles.disabled]}>
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
      contentContainerStyle={[styles.list, { paddingBottom: scrollEndPadding + 20 }]}
      showsVerticalScrollIndicator={false}>
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
        Move a category and readers see the new Explore order immediately. Hidden categories still
        work as search filters.
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
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.swatch, { backgroundColor: category.accent ?? colors.primary }]} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={category.label}
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
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
          title="No shelves yet"
          message="A shelf is a row on Home. Add one, put a few titles in it, and it appears the moment you publish it."
          actionLabel="Add the first shelf"
          onAction={onCreate}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[styles.list, { paddingBottom: scrollEndPadding + 20 }]}
      showsVerticalScrollIndicator={false}>
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
        Move a shelf and readers see the new Home order immediately. A hidden shelf stays linkable
        but disappears from Home.
      </OrderHint>
    </ScrollView>
  );
});

const KIND_LABEL: Record<AdminCollection['kind'], string> = {
  hero: 'Hero',
  shelf: 'Shelf',
  carousel: 'Carousel',
};

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
  const empty = collection.book_count === 0;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
        hidden && styles.dimmed,
      ]}>
      <Label size={10} leading={1} weight="700" tracking={0} tone="dim" style={styles.position}>
        {String(position)}
      </Label>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={collection.title}
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
        <Text size={14} leading={1.2} numberOfLines={1}>
          {collection.title}
        </Text>
        <Text size={11} leading={1.2} tone="faint" numberOfLines={1}>
          {`${KIND_LABEL[collection.kind]} · ${collection.book_count} ${
            collection.book_count === 1 ? 'book' : 'books'
          }`}
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
