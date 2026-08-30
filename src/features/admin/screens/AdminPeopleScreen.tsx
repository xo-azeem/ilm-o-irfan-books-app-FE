import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { DisplayText, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminSearchBar, AdminSegmented } from '@/features/admin/components/AdminControls';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  AdminBadge,
  AdminEmpty,
  AdminErrorState,
} from '@/features/admin/components/AdminUi';
import { useDebouncedValue } from '@/features/admin/hooks/useAdminForm';
import { formatRelative } from '@/features/admin/utils/format';
import { useAppInsets } from '@/hooks/useAppInsets';
import { useAdminUsers } from '@/hooks/useAdmin';
import type {
  AdminUserFilters,
  AdminUserRow,
  UserAccessFilter,
  UserRoleFilter,
} from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminPeopleStackParamList } from '../navigation/types';

const ROLE_OPTIONS: Array<{ value: UserRoleFilter; label: string }> = [
  { value: 'all', label: 'Everyone' },
  { value: 'user', label: 'Readers' },
  { value: 'admin', label: 'Admins' },
];

const ACCESS_OPTIONS: Array<{ value: UserAccessFilter; label: string }> = [
  { value: 'all', label: 'Any access' },
  { value: 'subscriber', label: 'Subscribers' },
  { value: 'free', label: 'Free' },
];

export function AdminPeopleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminPeopleStackParamList>>();
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();

  const [query, setQuery] = useState('');
  const [role, setRole] = useState<UserRoleFilter>('all');
  const [access, setAccess] = useState<UserAccessFilter>('all');

  const debounced = useDebouncedValue(query, 350);
  const filters = useMemo<AdminUserFilters>(
    () => ({ query: debounced, role, access }),
    [debounced, role, access],
  );

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAdminUsers(filters);

  const rows = useMemo(() => data?.pages.flatMap(page => page.rows) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  const renderItem = useCallback(
    ({ item, index }: { item: AdminUserRow; index: number }) => {
      const initials = (item.full_name ?? item.email ?? '?')
        .split(' ')
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join('');

      return (
        <Pressable
          onPress={() => navigation.navigate(ADMIN_ROUTES.USER_DETAIL, { userId: item.id })}
          style={({ pressed }) => ({
            backgroundColor: pressed ? colors.fill : colors.surface,
            borderTopLeftRadius: index === 0 ? 14 : 0,
            borderTopRightRadius: index === 0 ? 14 : 0,
            borderBottomLeftRadius: index === rows.length - 1 ? 14 : 0,
            borderBottomRightRadius: index === rows.length - 1 ? 14 : 0,
          })}
          className={`flex-row items-center gap-3 px-4 py-3 ${
            index === rows.length - 1
              ? ''
              : 'border-b border-app-border dark:border-app-border-dark'
          }`}>
          <View
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.fill }}>
            <Text className="text-[13px] font-semibold text-app-ink dark:text-app-ink-dark">
              {initials || '?'}
            </Text>
          </View>

          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-[15px] text-app-ink dark:text-app-ink-dark" numberOfLines={1}>
              {item.full_name || item.email || 'Unnamed reader'}
            </Text>
            <Text
              className="text-[12px] text-app-muted dark:text-app-muted-dark"
              numberOfLines={1}>
              {item.email ?? 'No email'} · {item.books_started} reading · last{' '}
              {formatRelative(item.last_read_at)}
            </Text>
          </View>

          <View className="items-end gap-1">
            {item.role === 'admin' ? <AdminBadge label="Admin" tone="danger" /> : null}
            {item.is_subscriber ? (
              <AdminBadge label={item.plan_name ?? 'Subscriber'} tone="accent" />
            ) : null}
          </View>
        </Pressable>
      );
    },
    [colors, navigation, rows.length],
  );

  return (
    <SafeAreaView className="flex-1 bg-app-bg dark:bg-app-bg-dark" edges={['top', 'left', 'right']}>
      <View className="px-5 pt-1">
        <View className="mb-4 gap-1">
          <DisplayText className="text-[34px] font-bold leading-[41px] tracking-tight text-app-ink dark:text-app-ink-dark">
            People
          </DisplayText>
          <Text className="text-[14px] text-app-muted dark:text-app-muted-dark">
            {total} {total === 1 ? 'account' : 'accounts'} · roles and subscriptions
          </Text>
        </View>

        <AdminSearchBar value={query} onChangeText={setQuery} placeholder="Search name or email" />

        <View className="mb-3 gap-2">
          <AdminSegmented options={ROLE_OPTIONS} value={role} onChange={setRole} />
          <AdminSegmented options={ACCESS_OPTIONS} value={access} onChange={setAccess} />
        </View>
      </View>

      {isLoading ? (
        <View className="px-5">
          <ListRowsSkeleton rows={8} />
        </View>
      ) : error ? (
        <View className="px-5">
          <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: scrollEndPadding }}
          ListEmptyComponent={
            <AdminEmpty
              title="No accounts match"
              message="Try a different search term or reset the filters."
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator className="py-5" color={colors.primary} />
            ) : null
          }
          style={{ flex: 1 }}
        />
      )}
    </SafeAreaView>
  );
}
