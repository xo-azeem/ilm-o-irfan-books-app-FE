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
  AdminHelper,
  AdminTextAction,
} from '@/features/admin/components/AdminUi';
import { useAdminCategories, useReorderCatalog } from '@/hooks/useAdmin';
import type { AdminCategory } from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminCatalogStackParamList } from '../navigation/types';

export function AdminCategoryListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminCatalogStackParamList>>();
  const { colors } = useTheme();
  const toast = useToast();

  const { data = [], isLoading, error, refetch } = useAdminCategories();
  const reorder = useReorderCatalog();

  const [order, setOrder] = useState<AdminCategory[]>([]);
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

  const saveOrder = () => {
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
  };

  return (
    <Screen>
      <AdminBackLink label="Catalog" />
      <ScreenHeader
        title="Categories"
        subtitle="Explore chips, in the order readers see them."
        action={
          reordering ? (
            <AdminTextAction
              label={reorder.isPending ? 'Saving…' : 'Done'}
              onPress={saveOrder}
              disabled={reorder.isPending}
            />
          ) : (
            <View className="flex-row items-center gap-4">
              {order.length > 1 ? (
                <AdminTextAction label="Reorder" onPress={() => setReordering(true)} />
              ) : null}
              <Pressable
                onPress={() => navigation.navigate(ADMIN_ROUTES.CATEGORY_EDITOR, {})}
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
          title="No categories"
          message="Categories power the Explore chips and the search filters."
          actionLabel="Add category"
          onAction={() => navigation.navigate(ADMIN_ROUTES.CATEGORY_EDITOR, {})}
        />
      ) : (
        <>
          <View className="overflow-hidden rounded-[14px] bg-app-surface dark:bg-app-surface-dark">
            {order.map((category, index) => (
              <View
                key={category.id}
                className={`flex-row items-center gap-3 px-4 py-3 ${
                  index === order.length - 1
                    ? ''
                    : 'border-b border-app-border dark:border-app-border-dark'
                }`}>
                <View
                  className="h-8 w-8 rounded-[9px]"
                  style={{ backgroundColor: category.accent ?? colors.fill }}
                />

                <Pressable
                  disabled={reordering}
                  onPress={() =>
                    navigation.navigate(ADMIN_ROUTES.CATEGORY_EDITOR, { categoryId: category.id })
                  }
                  className="min-w-0 flex-1 gap-0.5 active:opacity-60">
                  <Text
                    className="text-[16px] text-app-ink dark:text-app-ink-dark"
                    numberOfLines={1}>
                    {category.label}
                  </Text>
                  <Text
                    className="text-[12px] text-app-muted dark:text-app-muted-dark"
                    numberOfLines={1}>
                    {category.icon_key} · {category.slug}
                  </Text>
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
                ) : (
                  <AdminBadge
                    label={`${category.book_count} ${category.book_count === 1 ? 'book' : 'books'}`}
                    tone={category.book_count === 0 ? 'warning' : 'neutral'}
                  />
                )}
              </View>
            ))}
          </View>

          {reordering ? (
            <View className="pt-3">
              <AdminHelper>Move categories, then tap Done to save the new order.</AdminHelper>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
