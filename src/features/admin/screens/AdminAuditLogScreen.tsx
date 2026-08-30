import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { DisplayText, Text } from '@/components/ui';
import { AdminChipRow } from '@/features/admin/components/AdminControls';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminBadge,
  AdminEmpty,
  AdminErrorState,
} from '@/features/admin/components/AdminUi';
import { formatRelative } from '@/features/admin/utils/format';
import { useAppInsets } from '@/hooks/useAppInsets';
import { useAuditLog } from '@/hooks/useAdmin';
import type { AuditEntry } from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

const ENTITY_FILTERS: Array<{ value: string | null; label: string }> = [
  { value: null, label: 'All' },
  { value: 'books', label: 'Books' },
  { value: 'authors', label: 'Authors' },
  { value: 'categories', label: 'Categories' },
  { value: 'collections', label: 'Collections' },
  { value: 'plans', label: 'Plans' },
  { value: 'profiles', label: 'Roles' },
  { value: 'entitlements', label: 'Subscriptions' },
  { value: 'app_settings', label: 'Settings' },
];

/** Values worth showing inline; everything else is summarised by key. */
function describeChanges(changes: AuditEntry['changes']): string {
  const keys = Object.keys(changes ?? {});
  if (keys.length === 0) return '';

  const readable = keys.slice(0, 3).map(key => {
    const next = changes[key]?.to;
    if (typeof next === 'boolean') return `${key}: ${next ? 'on' : 'off'}`;
    if (typeof next === 'string' && next.length <= 24) return `${key}: ${next}`;
    if (typeof next === 'number') return `${key}: ${next}`;
    return key;
  });

  return keys.length > 3 ? `${readable.join(', ')} +${keys.length - 3}` : readable.join(', ');
}

export function AdminAuditLogScreen() {
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
  const [entity, setEntity] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAuditLog(entity);

  const rows = useMemo(() => data?.pages.flatMap(page => page.rows) ?? [], [data]);

  return (
    <SafeAreaView className="flex-1 bg-app-bg dark:bg-app-bg-dark" edges={['top', 'left', 'right']}>
      <View className="px-5 pt-1">
        <AdminBackLink label="System" />
        <View className="mb-4 gap-1">
          <DisplayText className="text-[30px] font-bold leading-[36px] tracking-tight text-app-ink dark:text-app-ink-dark">
            Audit log
          </DisplayText>
          <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
            Every write to the catalog, roles, plans, and settings.
          </Text>
        </View>

        <View className="mb-3">
          <AdminChipRow options={ENTITY_FILTERS} value={entity} onChange={setEntity} />
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
              title="Nothing recorded"
              message="Admin changes appear here as soon as someone edits the catalog."
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator className="py-5" color={colors.primary} />
            ) : null
          }
          renderItem={({ item, index }) => {
            const summary = describeChanges(item.changes);
            const isOpen = expanded === item.id;

            return (
              <Pressable
                onPress={() => setExpanded(isOpen ? null : item.id)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.fill : colors.surface,
                  borderTopLeftRadius: index === 0 ? 14 : 0,
                  borderTopRightRadius: index === 0 ? 14 : 0,
                  borderBottomLeftRadius: index === rows.length - 1 ? 14 : 0,
                  borderBottomRightRadius: index === rows.length - 1 ? 14 : 0,
                })}
                className={`gap-1.5 px-4 py-3 ${
                  index === rows.length - 1
                    ? ''
                    : 'border-b border-app-border dark:border-app-border-dark'
                }`}>
                <View className="flex-row items-center gap-2">
                  <AdminBadge
                    label={item.action}
                    tone={
                      item.action === 'delete'
                        ? 'danger'
                        : item.action === 'insert'
                        ? 'success'
                        : 'neutral'
                    }
                  />
                  <Text
                    className="min-w-0 flex-1 text-[14px] text-app-ink dark:text-app-ink-dark"
                    numberOfLines={1}>
                    {item.entity_label ?? item.entity_type}
                  </Text>
                  <Text className="text-[11px]" style={{ color: colors.faint }}>
                    {formatRelative(item.created_at)}
                  </Text>
                </View>

                <Text className="text-[11px] text-app-muted dark:text-app-muted-dark">
                  {item.entity_type} · {item.actor_email ?? 'system'}
                </Text>

                {summary ? (
                  <Text
                    className="text-[12px] text-app-muted dark:text-app-muted-dark"
                    numberOfLines={isOpen ? undefined : 1}>
                    {summary}
                  </Text>
                ) : null}

                {isOpen && Object.keys(item.changes ?? {}).length > 0 ? (
                  <View
                    className="mt-1 gap-1 rounded-[10px] p-2.5"
                    style={{ backgroundColor: colors.fill }}>
                    {Object.entries(item.changes).map(([key, change]) => (
                      <Text
                        key={key}
                        className="text-[11px] leading-[16px] text-app-muted dark:text-app-muted-dark">
                        <Text className="font-semibold text-app-ink dark:text-app-ink-dark">
                          {key}
                        </Text>
                        {`: ${JSON.stringify(change.from)} → ${JSON.stringify(change.to)}`}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </Pressable>
            );
          }}
          style={{ flex: 1 }}
        />
      )}
    </SafeAreaView>
  );
}
