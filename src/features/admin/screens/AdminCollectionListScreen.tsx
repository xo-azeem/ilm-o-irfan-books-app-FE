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
import { useAdminCollections, useReorderCatalog } from '@/hooks/useAdmin';
import type { AdminCollection } from '@/services/admin';
import { layout } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminCatalogStackParamList } from '../navigation/types';

/**
 * Collections are the curated rows on Home, so this order is literally the
 * order readers scroll through.
 */
export function AdminCollectionListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminCatalogStackParamList>>();
  const { tabBarHeight } = useAppInsets();
  const toast = useToast();

  const { data = [], isLoading, error, refetch } = useAdminCollections();
  const reorder = useReorderCatalog();

  const [order, setOrder] = useState<AdminCollection[]>([]);
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
      { table: 'collections', ids: order.map(item => item.id) },
      {
        onSuccess: () => {
          setReordering(false);
          toast.success('Order saved.');
        },
        onError: caught => toast.error(errorMessage(caught)),
      },
    );
  }, [order, reorder, toast]);

  const newCollection = useCallback(
    () => navigation.navigate(ADMIN_ROUTES.COLLECTION_EDITOR, {}),
    [navigation],
  );

  const openCollection = useCallback(
    (collectionId: string) =>
      navigation.navigate(ADMIN_ROUTES.COLLECTION_EDITOR, { collectionId }),
    [navigation],
  );

  return (
    <Screen
      padding={layout.adminPadding}
      gap={14}
      overlay={
        !reordering ? (
          <FloatingAction
            label="New collection"
            icon={Plus}
            onPress={newCollection}
            style={[styles.fab, { bottom: tabBarHeight + 14 }]}
          />
        ) : null
      }>
      <AdminBackLink label="Catalog" />
      <ScreenHeader
        title="Collections"
        dense
        subtitle="Hero, shelf and carousel rows on Home."
        action={
          reordering ? (
            <AdminTextAction
              label={reorder.isPending ? 'Saving…' : 'Done'}
              disabled={reorder.isPending}
              onPress={saveOrder}
            />
          ) : order.length > 1 ? (
            <AdminTextAction label="Reorder" onPress={() => setReordering(true)} />
          ) : null
        }
      />

      {isLoading ? (
        <ListRowsSkeleton count={5} height={66} />
      ) : error ? (
        <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : order.length === 0 ? (
        <AdminEmpty
          title="No collections yet"
          message="Collections are the curated rows on the Home screen."
          actionLabel="Add collection"
          onAction={newCollection}
        />
      ) : (
        <>
          <AdminRowGroup>
            {order.map((collection, index) => (
              <CollectionRow
                key={collection.id}
                collection={collection}
                index={index}
                isFirst={index === 0}
                isLast={index === order.length - 1}
                reordering={reordering}
                onMove={move}
                onPress={openCollection}
              />
            ))}
          </AdminRowGroup>

          {reordering ? (
            <AdminHelper>Move collections, then tap Done to save the new order.</AdminHelper>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const CollectionRow = memo(function CollectionRow({
  collection,
  index,
  isFirst,
  isLast,
  reordering,
  onMove,
  onPress,
}: {
  collection: AdminCollection;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  reordering: boolean;
  onMove: (index: number, delta: number) => void;
  onPress: (collectionId: string) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onPress(collection.id), [collection.id, onPress]);

  return (
    <View style={[styles.row, !collection.is_published && styles.hidden]}>
      <View style={[styles.spine, { backgroundColor: collection.accent ?? colors.primary }]} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={collection.title}
        disabled={reordering}
        onPress={handlePress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
        <Text size={14.5} leading={1.2} numberOfLines={1}>
          {collection.title}
        </Text>
        <View style={styles.badges}>
          <AdminBadge label={collection.kind} tone="neutral" />
          <AdminBadge
            label={collection.is_published ? 'Live' : 'Hidden'}
            tone={collection.is_published ? 'success' : 'neutral'}
          />
          {collection.book_count === 0 ? (
            <AdminBadge label="Empty" tone="warning" />
          ) : (
            <Text size={11.5} leading={1} tone="faint">
              {`${collection.book_count} books`}
            </Text>
          )}
        </View>
      </Pressable>

      {reordering ? (
        <View style={styles.arrows}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Move ${collection.title} up`}
            onPress={() => onMove(index, -1)}
            disabled={isFirst}
            hitSlop={6}
            style={[styles.arrow, isFirst && styles.disabled]}>
            <Icon icon={ChevronUp} size={17} tone="muted" strokeWidth={2.2} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Move ${collection.title} down`}
            onPress={() => onMove(index, 1)}
            disabled={isLast}
            hitSlop={6}
            style={[styles.arrow, isLast && styles.disabled]}>
            <Icon icon={ChevronDown} size={17} tone="muted" strokeWidth={2.2} />
          </Pressable>
        </View>
      ) : null}
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
  hidden: {
    opacity: 0.65,
  },
  spine: {
    width: 5,
    height: 34,
    borderRadius: 3,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
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
