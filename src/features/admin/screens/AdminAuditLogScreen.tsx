import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Display, Text } from '@/components/ui';
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
import { layout } from '@/theme/palette';
import { fonts } from '@/theme/typography';
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
  if (keys.length === 0) {
    return '';
  }

  const readable = keys.slice(0, 3).map(key => {
    const next = changes[key]?.to;
    if (typeof next === 'boolean') {
      return `${key}: ${next ? 'on' : 'off'}`;
    }
    if (typeof next === 'string' && next.length <= 24) {
      return `${key}: ${next}`;
    }
    if (typeof next === 'number') {
      return `${key}: ${next}`;
    }
    return key;
  });

  return keys.length > 3 ? `${readable.join(', ')} +${keys.length - 3}` : readable.join(', ');
}

/** Every write to the catalog, roles, plans and settings. */
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

  const toggle = useCallback(
    (id: string) => setExpanded(current => (current === id ? null : id)),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: AuditEntry }) => (
      <AuditRow entry={item} expanded={expanded === item.id} onToggle={toggle} />
    ),
    [expanded, toggle],
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <AdminBackLink label="System" />
        <View style={styles.titles}>
          <Display size="screenDense">Audit log</Display>
          <Text size={12.5} leading={1.4} tone="muted">
            Every write to the catalog, roles, plans and settings.
          </Text>
        </View>
        <AdminChipRow options={ENTITY_FILTERS} value={entity} onChange={setEntity} />
      </View>

      {isLoading ? (
        <View style={styles.listPad}>
          <ListRowsSkeleton count={8} height={80} />
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
          ItemSeparatorComponent={ListGap}
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
              title="Nothing recorded"
              message="Admin changes appear here as soon as someone edits the catalog."
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

function ListGap() {
  return <View style={styles.gap} />;
}

const AuditRow = memo(function AuditRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: AuditEntry;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const { colors } = useTheme();
  const summary = describeChanges(entry.changes);
  const changeKeys = Object.keys(entry.changes ?? {});

  const handlePress = useCallback(() => onToggle(entry.id), [entry.id, onToggle]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.borderSoft },
        pressed && styles.pressed,
      ]}>
      <View style={styles.rowHeader}>
        <AdminBadge
          label={entry.action}
          tone={
            entry.action === 'delete' ? 'danger' : entry.action === 'insert' ? 'success' : 'neutral'
          }
        />
        <Text size={13.5} leading={1.2} numberOfLines={1} style={styles.grow}>
          {entry.entity_label ?? entry.entity_type}
        </Text>
        <Text size={11} leading={1} tone="dim">
          {formatRelative(entry.created_at)}
        </Text>
      </View>

      <Text size={11} leading={1.2} tone="faint" numberOfLines={1}>
        {`${entry.entity_type} · ${entry.actor_email ?? 'system'}`}
      </Text>

      {summary ? (
        <Text size={12} leading={1.4} tone="muted" numberOfLines={expanded ? undefined : 1}>
          {summary}
        </Text>
      ) : null}

      {expanded && changeKeys.length > 0 ? (
        <View style={[styles.diff, { backgroundColor: colors.background }]}>
          {changeKeys.map(key => (
            <Text
              key={key}
              size={11}
              leading={1.5}
              tone="muted"
              style={styles.diffLine}>
              <Text size={11} leading={1.5} weight="600" style={styles.diffLine}>
                {key}
              </Text>
              {`: ${JSON.stringify(entry.changes[key].from)} → ${JSON.stringify(
                entry.changes[key].to,
              )}`}
            </Text>
          ))}
        </View>
      ) : null}
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
  titles: {
    gap: 6,
  },
  list: {
    flex: 1,
  },
  listPad: {
    paddingHorizontal: layout.adminPadding,
  },
  gap: {
    height: 9,
  },
  row: {
    gap: 6,
    padding: 13,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  diff: {
    marginTop: 4,
    gap: 4,
    padding: 10,
    borderRadius: 10,
  },
  diffLine: {
    // A diff is data; the mono face keeps keys and values aligned.
    fontFamily: fonts.mono,
  },
  footer: {
    paddingVertical: 20,
  },
  pressed: {
    opacity: 0.82,
  },
});
