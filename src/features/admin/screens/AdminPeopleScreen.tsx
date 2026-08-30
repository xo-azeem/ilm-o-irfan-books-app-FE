import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import {
  Avatar,
  Display,
  Label,
  SearchField,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { errorMessage } from '@/features/admin/components/AdminToast';
import { AdminBadge, AdminEmpty, AdminErrorState } from '@/features/admin/components/AdminUi';
import { useDebouncedValue } from '@/features/admin/hooks/useAdminForm';
import { useAppInsets } from '@/hooks/useAppInsets';
import { useAdminUsers } from '@/hooks/useAdmin';
import type {
  AdminUserFilters,
  AdminUserRow,
  UserAccessFilter,
  UserRoleFilter,
} from '@/services/admin';
import { layout } from '@/theme/palette';
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

/**
 * People.
 *
 * Both segmented filters are kept. The plan name replaces a generic
 * "subscriber" badge, so the revenue mix is readable straight down the list.
 */
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

  const openUser = useCallback(
    (userId: string) => navigation.navigate(ADMIN_ROUTES.USER_DETAIL, { userId }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: AdminUserRow }) => <PersonRow user={item} onPress={openUser} />,
    [openUser],
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Display size="screenDense">People</Display>
          <Label uppercase tracking={0.8}>
            {`${total} ${total === 1 ? 'account' : 'accounts'}`}
          </Label>
        </View>

        <SearchField
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          dense
          placeholder="Search name or email"
        />

        <SegmentedControl options={ROLE_OPTIONS} value={role} onChange={setRole} />
        <SegmentedControl
          options={ACCESS_OPTIONS}
          value={access}
          onChange={setAccess}
          variant="soft"
        />
      </View>

      {isLoading ? (
        <View style={styles.listPad}>
          <ListRowsSkeleton count={8} height={62} />
        </View>
      ) : error ? (
        <View style={styles.listPad}>
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
          contentContainerStyle={{
            paddingHorizontal: layout.adminPadding,
            paddingBottom: scrollEndPadding,
          }}
          ListEmptyComponent={
            <AdminEmpty
              title="No accounts match"
              message="Try a different search term or reset the filters."
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={colors.primary} />
            ) : null
          }
          style={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const PersonRow = memo(function PersonRow({
  user,
  onPress,
}: {
  user: AdminUserRow;
  onPress: (userId: string) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onPress(user.id), [onPress, user.id]);

  const isAdmin = user.role === 'admin';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={user.full_name || user.email || 'Reader'}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.divider },
        pressed && { backgroundColor: colors.primaryFillSoft },
      ]}>
      <Avatar
        name={user.full_name ?? user.email}
        size={38}
        shape="squircle"
        tone={isAdmin ? 'danger' : user.is_subscriber ? 'primary' : 'neutral'}
      />

      <View style={styles.body}>
        <Text size={14} leading={1.2} weight="500" numberOfLines={1}>
          {user.full_name || user.email || 'Unnamed reader'}
        </Text>
        <Text size={11.5} leading={1.2} tone="muted" numberOfLines={1}>
          {user.email ?? 'No email'}
        </Text>
      </View>

      {isAdmin ? (
        <AdminBadge label="Admin" tone="danger" />
      ) : user.is_subscriber ? (
        <AdminBadge label={user.plan_name ?? 'Subscriber'} tone="accent" />
      ) : (
        <Label size={11} tracking={0.6} tone="dim">
          Free
        </Label>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: layout.adminPadding,
    paddingTop: 4,
    paddingBottom: 13,
    gap: 13,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  list: {
    flex: 1,
  },
  listPad: {
    paddingHorizontal: layout.adminPadding,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  footer: {
    paddingVertical: 20,
  },
});
