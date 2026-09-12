import { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Label, Text } from '@/components/ui';
import { AdminChipRow } from '@/features/admin/components/AdminControls';
import { AdminMenuSkeleton } from '@/features/admin/components/AdminSkeletons';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminBackLink,
  AdminEmpty,
  AdminErrorState,
  AdminEyebrow,
  AdminScreenTitle,
  AdminTag,
} from '@/features/admin/components/AdminUi';
import { useAppInsets } from '@/hooks/useAppInsets';
import { useAuditLog } from '@/hooks/useAdmin';
import type { AuditEntry } from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

type Scope = 'all' | 'books' | 'people' | 'deletions';

const SCOPES: Array<{ value: Scope; label: string }> = [
  { value: 'all', label: 'Everything' },
  { value: 'books', label: 'Books' },
  { value: 'people', label: 'People' },
  { value: 'deletions', label: 'Deletions' },
];

/** Which entity table each scope reads from. Deletions cut across all of them. */
const SCOPE_ENTITY: Record<Scope, string | null> = {
  all: null,
  books: 'books',
  people: 'profiles',
  deletions: null,
};

const ACTION_LABEL: Record<AuditEntry['action'], string> = {
  insert: 'NEW',
  update: 'EDIT',
  delete: 'DEL',
};

type Section = { key: string; title: string; entries: AuditEntry[] };

/**
 * Change history.
 *
 * The audit log as sentences rather than rows of JSON: what happened, to what,
 * by whom — with the before and after spelled out underneath when a value
 * actually changed. Grouped by day, because "was this today?" is the first
 * question anyone asks of it.
 */
export function AdminHistoryScreen() {
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
  const [scope, setScope] = useState<Scope>('all');

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAuditLog(SCOPE_ENTITY[scope]);

  const sections = useMemo<Section[]>(() => {
    const rows = data?.pages.flatMap(page => page.rows) ?? [];
    // "Deletions" is a question about the action, not the table, so it narrows
    // what is already loaded rather than asking the server for a column it
    // does not filter on.
    const filtered =
      scope === 'deletions'
        ? rows.filter(row => row.action === 'delete')
        : rows;

    const byDay = new Map<string, AuditEntry[]>();
    for (const entry of filtered) {
      const key = dayKey(entry.created_at);
      const bucket = byDay.get(key);
      if (bucket) {
        bucket.push(entry);
      } else {
        byDay.set(key, [entry]);
      }
    }

    return [...byDay.entries()].map(([key, entries]) => ({
      key,
      title: dayTitle(entries[0].created_at),
      entries,
    }));
  }, [data?.pages, scope]);

  const renderSection = useCallback(
    ({ item }: { item: Section }) => (
      <View style={styles.section}>
        <AdminEyebrow tone="dim">{item.title}</AdminEyebrow>
        <View style={styles.entries}>
          {item.entries.map(entry => (
            <HistoryEntry key={entry.id} entry={entry} />
          ))}
        </View>
      </View>
    ),
    [],
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <AdminBackLink label="System" />
        <AdminScreenTitle title="Change history" />
        <AdminChipRow options={SCOPES} value={scope} onChange={setScope} />
      </View>

      {isLoading ? (
        <View style={styles.gutter}>
          <AdminMenuSkeleton count={5} height={78} />
        </View>
      ) : error ? (
        <View style={styles.gutter}>
          <AdminErrorState
            title="Couldn't load the history"
            message="The log did not come back. Nothing has been changed."
            detail={errorMessage(error)}
            onRetry={() => void refetch()}
          />
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={item => item.key}
          renderItem={renderSection}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          }}
          contentContainerStyle={{
            paddingHorizontal: ADMIN_GUTTER,
            paddingBottom: scrollEndPadding + 20,
          }}
          ListEmptyComponent={
            <AdminEmpty
              title={scope === 'all' ? 'Nothing recorded yet' : 'Nothing here'}
              message={
                scope === 'deletions'
                  ? 'No deletion appears in the history loaded so far. Scroll the full log to look further back.'
                  : 'Every create, edit and delete lands here with the account that made it.'
              }
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={colors.primary} />
            ) : null
          }
          style={styles.grow}
        />
      )}
    </SafeAreaView>
  );
}

const HistoryEntry = memo(function HistoryEntry({
  entry,
}: {
  entry: AuditEntry;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const changes = Object.entries(entry.changes ?? {});
  const canExpand = entry.action === 'update' && changes.length > 0;
  const visible = expanded ? changes : changes.slice(0, 2);

  return (
    <Pressable
      accessibilityRole={canExpand ? 'button' : 'text'}
      accessibilityState={{ expanded: canExpand ? expanded : undefined }}
      disabled={!canExpand || changes.length <= 2}
      onPress={() => setExpanded(current => !current)}
      style={({ pressed }) => [
        styles.entry,
        {
          backgroundColor: colors.surface,
          borderColor:
            entry.action === 'delete' ? colors.dangerBorder : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.entryHeader}>
        <AdminTag
          label={ACTION_LABEL[entry.action]}
          tone={
            entry.action === 'delete'
              ? 'danger'
              : entry.action === 'insert'
                ? 'success'
                : 'neutral'
          }
        />
        <Text size={13} leading={1.3} style={styles.grow}>
          {sentence(entry)}
          <Text
            size={13}
            leading={1.3}
            tone={entry.action === 'delete' ? 'soft' : 'action'}
          >
            {entry.entity_label ?? entry.entity_type}
          </Text>
        </Text>
        <Text size={10.5} leading={1} tone="dim">
          {time(entry.created_at)}
        </Text>
      </View>

      {canExpand ? (
        <View style={[styles.diff, { backgroundColor: colors.surfaceAlt }]}>
          {visible.map(([key, change]) => (
            <View key={key} style={styles.diffRow}>
              <Label
                size={11}
                leading={1.3}
                weight="400"
                tracking={0}
                uppercase={false}
                tone="faint"
                numberOfLines={1}
                style={styles.diffKey}
              >
                {key}
              </Label>
              <Label
                size={11}
                leading={1.3}
                weight="400"
                tracking={0}
                uppercase={false}
                tone="danger"
                numberOfLines={1}
                style={styles.struck}
              >
                {short(change.from)}
              </Label>
              <Label
                size={11}
                leading={1.3}
                weight="400"
                tracking={0}
                uppercase={false}
                tone="dim"
              >
                →
              </Label>
              <Label
                size={11}
                leading={1.3}
                weight="400"
                tracking={0}
                uppercase={false}
                tone="action"
                numberOfLines={1}
                style={styles.grow}
              >
                {short(change.to)}
              </Label>
            </View>
          ))}
          {!expanded && changes.length > 2 ? (
            <Text size={11} leading={1.3} tone="faint">
              {`+${changes.length - 2} more — tap to see`}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text size={11} leading={1.4} tone="faint" numberOfLines={1}>
        {entry.actor_email ?? 'system'}
      </Text>
    </Pressable>
  );
});

/** "Created book ", "Changed 2 fields on ", "Deleted draft " — the entity follows. */
function sentence(entry: AuditEntry): string {
  const noun = entry.entity_type.replace(/s$/, '');
  if (entry.action === 'insert') {
    return `Created ${noun} `;
  }
  if (entry.action === 'delete') {
    return `Deleted ${noun} `;
  }
  const count = Object.keys(entry.changes ?? {}).length;
  if (count === 0) {
    return 'Touched ';
  }
  return `Changed ${count} ${count === 1 ? 'field' : 'fields'} on `;
}

function short(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string')
    return value.length > 22 ? `${value.slice(0, 21)}…` : value;
  if (typeof value === 'boolean' || typeof value === 'number')
    return String(value);
  return Array.isArray(value) ? `${value.length} items` : '…';
}

function dayKey(value: string): string {
  return new Date(value).toDateString();
}

function dayTitle(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function time(value: string): string {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 4,
    paddingBottom: 13,
    gap: 13,
  },
  gutter: {
    paddingHorizontal: ADMIN_GUTTER,
  },
  grow: { flex: 1, minWidth: 0 },
  section: {
    gap: 9,
    paddingBottom: 15,
  },
  entries: {
    gap: 9,
  },
  entry: {
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  diff: {
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 11,
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diffKey: {
    width: 62,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  footer: {
    paddingVertical: 20,
  },
  pressed: {
    opacity: 0.82,
  },
});
