import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminBadge,
  AdminEmpty,
  AdminErrorState,
  AdminTextAction,
} from '@/features/admin/components/AdminUi';
import { useAdminCollections, useReorderCatalog } from '@/hooks/useAdmin';
import type { AdminCollection } from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminCatalogStackParamList } from '../navigation/types';

export function AdminCollectionListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminCatalogStackParamList>>();
  const { colors } = useTheme();
  const toast = useToast();

  const { data = [], isLoading, error, refetch } = useAdminCollections();
  const reorder = useReorderCatalog();

  const [order, setOrder] = useState<AdminCollection[]>([]);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    setOrder(data);
  }, [data]);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setOrder(next);
  };

  return (
    <Screen>
      <AdminBackLink label="Catalog" />
      <ScreenHeader
        title="Collections"
        subtitle="Hero, shelf, and carousel rows on Home."
        action={
          reordering ? (
            <AdminTextAction
              label={reorder.isPending ? 'Saving…' : 'Done'}
              disabled={reorder.isPending}
              onPress={() =>
                reorder.mutate(
                  { table: 'collections', ids: order.map(item => item.id) },
                  {
                    onSuccess: () => {
                      setReordering(false);
                      toast.success('Order saved.');
                    },
                    onError: caught => toast.error(errorMessage(caught)),
                  },
                )
              }
            />
          ) : (
            <View className="flex-row items-center gap-4">
              {order.length > 1 ? (
                <AdminTextAction label="Reorder" onPress={() => setReordering(true)} />
              ) : null}
              <Pressable
                onPress={() => navigation.navigate(ADMIN_ROUTES.COLLECTION_EDITOR, {})}
                className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
                style={{ backgroundColor: colors.primary }}>
                <Plus size={19} color={colors.onPrimary} strokeWidth={2.4} />
              </Pressable>
            </View>
          )
        }
      />

      {isLoading ? (
        <ListRowsSkeleton rows={5} />
      ) : error ? (
        <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : order.length === 0 ? (
        <AdminEmpty
          title="No collections"
          message="Collections are the curated rows on the Home screen."
          actionLabel="Add collection"
          onAction={() => navigation.navigate(ADMIN_ROUTES.COLLECTION_EDITOR, {})}
        />
      ) : (
        <View className="overflow-hidden rounded-[14px] bg-app-surface dark:bg-app-surface-dark">
          {order.map((collection, index) => (
            <View
              key={collection.id}
              className={`flex-row items-center gap-3 px-4 py-3 ${
                index === order.length - 1
                  ? ''
                  : 'border-b border-app-border dark:border-app-border-dark'
              }`}>
              <View
                className="h-9 w-1.5 rounded-full"
                style={{ backgroundColor: collection.accent ?? colors.primary }}
              />

              <Pressable
                disabled={reordering}
                onPress={() =>
                  navigation.navigate(ADMIN_ROUTES.COLLECTION_EDITOR, {
                    collectionId: collection.id,
                  })
                }
                className="min-w-0 flex-1 gap-1 active:opacity-60">
                <Text className="text-[16px] text-app-ink dark:text-app-ink-dark" numberOfLines={1}>
                  {collection.title}
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <AdminBadge label={collection.kind} tone="neutral" />
                  <AdminBadge
                    label={collection.is_published ? 'Live' : 'Hidden'}
                    tone={collection.is_published ? 'success' : 'neutral'}
                  />
                  {collection.book_count === 0 ? (
                    <AdminBadge label="Empty" tone="warning" />
                  ) : (
                    <Text className="text-[12px] text-app-muted dark:text-app-muted-dark">
                      {collection.book_count} books
                    </Text>
                  )}
                </View>
              </Pressable>

              {reordering ? (
                <View className="flex-row">
                  <Pressable
                    onPress={() => move(index, -1)}
                    disabled={index === 0}
                    hitSlop={6}
                    className="p-1.5 active:opacity-60"
                    style={{ opacity: index === 0 ? 0.25 : 1 }}>
                    <ChevronUp size={18} color={colors.muted} strokeWidth={2.2} />
                  </Pressable>
                  <Pressable
                    onPress={() => move(index, 1)}
                    disabled={index === order.length - 1}
                    hitSlop={6}
                    className="p-1.5 active:opacity-60"
                    style={{ opacity: index === order.length - 1 ? 0.25 : 1 }}>
                    <ChevronDown size={18} color={colors.muted} strokeWidth={2.2} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
