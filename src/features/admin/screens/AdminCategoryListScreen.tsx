import { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { FloatingAction, Icon, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminBadge,
  AdminEmpty,
  AdminErrorState,
  AdminHelper,
  AdminRowGroup,
  AdminTextAction,
} from '@/features/admin/components/AdminUi';
import { useAppInsets } from '@/hooks/useAppInsets';
import { useAdminCategories, useReorderCatalog } from '@/hooks/useAdmin';
import type { AdminCategory } from '@/services/admin';
import { layout } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminCatalogStackParamList } from '../navigation/types';

/**
 * Categories power the Discover tiles and the search filters, so their order is
 * a merchandising decision — hence the explicit reorder mode rather than an
 * always-live drag.
 */
export function AdminCategoryListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminCatalogStackParamList>>();
  const { tabBarHeight } = useAppInsets();
  const toast = useToast();

  const { data = [], isLoading, error, refetch } = useAdminCategories();
  const reorder = useReorderCatalog();

  const [order, setOrder] = useState<AdminCategory[]>([]);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    setOrder(data);
  }, [data]);

  const move = useCallback((index: number, delta: number) => {
    setOrder(current => {
      const target = index + delta;
      if (target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }, []);

  const saveOrder = useCallback(() => {
    reorder.mutate(
      { table: 'categories', ids: order.map(item => item.id) },
      {
        onSuccess: () => {
          setReordering(false);
          toast.success('Order saved.');
        },
        onError: caught => toast.error(errorMessage(caught)),
      },
    );
  }, [order, reorder, toast]);

  const newCategory = useCallback(
    () => navigation.navigate(ADMIN_ROUTES.CATEGORY_EDITOR, {}),
    [navigation],
  );

  const openCategory = useCallback(
    (categoryId: string) => navigation.navigate(ADMIN_ROUTES.CATEGORY_EDITOR, { categoryId }),
    [navigation],
  );

  return (
    <Screen
      padding={layout.adminPadding}
      gap={14}
      overlay={
        !reordering ? (
          <FloatingAction
            label="New category"
            icon={Plus}
            onPress={newCategory}
            style={[styles.fab, { bottom: tabBarHeight + 14 }]}
          />
        ) : null
      }>
      <AdminBackLink label="Catalog" />
      <ScreenHeader
        title="Categories"
        dense
        subtitle="Discover tiles, in the order readers see them."
        action={
          reordering ? (
            <AdminTextAction
              label={reorder.isPending ? 'Saving…' : 'Done'}
              onPress={saveOrder}
              disabled={reorder.isPending}
            />
          ) : order.length > 1 ? (
            <AdminTextAction label="Reorder" onPress={() => setReordering(true)} />
          ) : null
        }
      />

      {isLoading ? (
        <ListRowsSkeleton count={5} height={60} />
      ) : error ? (
        <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : order.length === 0 ? (
        <AdminEmpty
          title="No categories yet"
          message="Categories power the Discover tiles and the search filters."
          actionLabel="Add category"
          onAction={newCategory}
        />
      ) : (
        <>
          <AdminRowGroup>
            {order.map((category, index) => (
              <CategoryRow
                key={category.id}
                category={category}
                index={index}
                isFirst={index === 0}
                isLast={index === order.length - 1}
                reordering={reordering}
                onMove={move}
                onPress={openCategory}
              />
            ))}
          </AdminRowGroup>

          {reordering ? (
            <AdminHelper>Move categories, then tap Done to save the new order.</AdminHelper>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const CategoryRow = memo(function CategoryRow({
  category,
  index,
  isFirst,
  isLast,
  reordering,
  onMove,
  onPress,
}: {
  category: AdminCategory;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  reordering: boolean;
  onMove: (index: number, delta: number) => void;
  onPress: (categoryId: string) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onPress(category.id), [category.id, onPress]);

  return (
    <View style={styles.row}>
      <View
        style={[styles.swatch, { backgroundColor: category.accent ?? colors.primaryFillSoft }]}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={category.label}
        disabled={reordering}
        onPress={handlePress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
        <Text size={14.5} leading={1.2} numberOfLines={1}>
          {category.label}
        </Text>
        <Text size={11.5} leading={1.2} tone="faint" numberOfLines={1}>
          {`${category.icon_key} · ${category.slug}`}
        </Text>
      </Pressable>

      {reordering ? (
        <View style={styles.arrows}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Move ${category.label} up`}
            onPress={() => onMove(index, -1)}
            disabled={isFirst}
            hitSlop={6}
            style={[styles.arrow, isFirst && styles.disabled]}>
            <Icon icon={ChevronUp} size={17} tone="muted" strokeWidth={2.2} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Move ${category.label} down`}
            onPress={() => onMove(index, 1)}
            disabled={isLast}
            hitSlop={6}
            style={[styles.arrow, isLast && styles.disabled]}>
            <Icon icon={ChevronDown} size={17} tone="muted" strokeWidth={2.2} />
          </Pressable>
        </View>
      ) : (
        <AdminBadge
          label={`${category.book_count} ${category.book_count === 1 ? 'book' : 'books'}`}
          tone={category.book_count === 0 ? 'warning' : 'neutral'}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 9,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  arrows: {
    flexDirection: 'row',
  },
  arrow: {
    padding: 4,
  },
  disabled: {
    opacity: 0.25,
  },
  pressed: {
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    right: layout.adminPadding,
  },
});
