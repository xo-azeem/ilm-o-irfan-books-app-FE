import { memo, useCallback } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BookPlus,
  ChartNoAxesColumn,
  Library,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { AdminStatsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Callout, Icon, Label, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  AdminBadge,
  AdminErrorState,
  AdminRowGroup,
  AdminStat,
  AdminStatRow,
  AdminTextAction,
  useAdminRefresh,
} from '@/features/admin/components/AdminUi';
import { formatRelative } from '@/features/admin/utils/format';
import { useAdminStats, useAuditLog } from '@/hooks/useAdmin';
import { useAuthStore } from '@/stores/authStore';
import { layout, radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminTabParamList } from '../navigation/types';

type Nav = {
  navigate: <T extends keyof AdminTabParamList>(
    screen: T,
    params?: AdminTabParamList[T],
  ) => void;
};

/**
 * Admin overview.
 *
 * The same numbers the panel has always shown, reordered around the question an
 * admin actually opens it with: what is broken, what should I do, then how are
 * we doing.
 */
export function AdminOverviewScreen() {
  const navigation = useNavigation() as unknown as Nav;
  const email = useAuthStore(state => state.email);
  const signOut = useAuthStore(state => state.signOut);

  const { data, isLoading, error, refetch, isRefetching } = useAdminStats();
  const refreshProps = useAdminRefresh(isRefetching, () => {
    void refetch();
  });

  const audit = useAuditLog(null);
  const recent = audit.data?.pages[0]?.rows.slice(0, 4) ?? [];

  const missingPdf = data?.missing_pdf_count ?? 0;
  const missingCover = data?.missing_cover_count ?? 0;
  const needsAttention = missingPdf + missingCover > 0;

  const goToBooks = useCallback(
    (status?: 'draft' | 'incomplete') =>
      navigation.navigate(ADMIN_ROUTES.BOOKS, {
        screen: ADMIN_ROUTES.BOOK_LIST,
        params: status ? { status } : undefined,
      }),
    [navigation],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Leave the admin panel?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }, [signOut]);

  return (
    <Screen padding={layout.adminPadding} gap={12} scrollViewProps={refreshProps}>
      <ScreenHeader
        title="Overview"
        dense
        subtitle={email || 'admin'}
        action={<AdminTextAction label="Sign out" onPress={handleSignOut} />}
      />

      {/* What is broken, first. */}
      {needsAttention ? (
        <Callout
          tone="warning"
          icon={TriangleAlert}
          title={`${missingPdf} titles without a PDF, ${missingCover} without a cover`}
          message="Tap to review incomplete titles."
          onPress={() => goToBooks('incomplete')}
        />
      ) : null}

      {/* Then what to do about it. */}
      <View style={styles.section}>
        <Label size={fontSize.labelSmall} tracking={1.6}>
          Quick actions
        </Label>
        <View style={styles.actions}>
          <QuickAction
            label="New book"
            icon={BookPlus}
            onPress={() =>
              navigation.navigate(ADMIN_ROUTES.BOOKS, {
                screen: ADMIN_ROUTES.BOOK_EDITOR,
                params: {},
              })
            }
          />
          <QuickAction
            label="Catalog"
            icon={Library}
            onPress={() => navigation.navigate(ADMIN_ROUTES.CATALOG)}
          />
          <QuickAction
            label="People"
            icon={Users}
            onPress={() => navigation.navigate(ADMIN_ROUTES.PEOPLE)}
          />
          <QuickAction
            label="Analytics"
            icon={ChartNoAxesColumn}
            onPress={() =>
              navigation.navigate(ADMIN_ROUTES.SYSTEM, { screen: ADMIN_ROUTES.ANALYTICS })
            }
          />
        </View>
      </View>

      {/* Then the numbers. */}
      {isLoading ? (
        <AdminStatsSkeleton />
      ) : error ? (
        <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <>
          <View style={styles.section}>
            <Label size={fontSize.labelSmall} tracking={1.6}>
              Last 7 days
            </Label>
            <AdminStatRow>
              <AdminStat label="New readers" value={data?.signups_7d ?? 0} tone="success" />
              <AdminStat label="Reading sessions" value={data?.reads_7d ?? 0} />
              <AdminStat label="Downloads" value={data?.downloads_7d ?? 0} />
            </AdminStatRow>
          </View>

          <View style={styles.section}>
            <Label size={fontSize.labelSmall} tracking={1.6}>
              Audience
            </Label>
            <AdminStatRow>
              <AdminStat
                label="Users"
                value={data?.user_count ?? 0}
                onPress={() => navigation.navigate(ADMIN_ROUTES.PEOPLE)}
              />
              <AdminStat label="Subs" value={data?.subscriber_count ?? 0} tone="accent" />
              <AdminStat label="Free" value={data?.guest_signed_in_count ?? 0} />
              <AdminStat label="Admins" value={data?.admin_count ?? 0} />
            </AdminStatRow>
          </View>

          <View style={styles.section}>
            <Label size={fontSize.labelSmall} tracking={1.6}>
              Catalog
            </Label>
            <AdminStatRow>
              <AdminStat
                label="Published"
                value={data?.book_published_count ?? 0}
                tone="success"
                onPress={() => goToBooks()}
              />
              <AdminStat
                label="Drafts"
                value={data?.book_draft_count ?? 0}
                onPress={() => goToBooks('draft')}
              />
            </AdminStatRow>

            {/* The long tail reads better as a sentence than as six more tiles. */}
            <View style={styles.inlineCounts}>
              <InlineCount value={data?.author_count ?? 0} label="authors" />
              <InlineCount value={data?.category_count ?? 0} label="categories" />
              <InlineCount value={data?.collection_count ?? 0} label="collections" />
              <InlineCount value={data?.plan_count ?? 0} label="active plans" />
            </View>
          </View>
        </>
      )}

      <AdminRowGroup
        title="Recent activity"
        action={
          <AdminTextAction
            label="View all"
            onPress={() =>
              navigation.navigate(ADMIN_ROUTES.SYSTEM, { screen: ADMIN_ROUTES.AUDIT_LOG })
            }
          />
        }>
        {recent.length === 0 ? (
          <View style={styles.emptyActivity}>
            <Text size={fontSize.caption} leading={1.4} tone="muted">
              No admin changes recorded yet.
            </Text>
          </View>
        ) : (
          recent.map(entry => (
            <ActivityRow
              key={entry.id}
              action={entry.action}
              label={entry.entity_label ?? entry.entity_type}
              detail={`${entry.entity_type} · ${entry.actor_email ?? 'system'}`}
              when={formatRelative(entry.created_at)}
            />
          ))
        )}
      </AdminRowGroup>
    </Screen>
  );
}

const QuickAction = memo(function QuickAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        { backgroundColor: colors.surface },
        pressed && styles.pressed,
      ]}>
      <Icon icon={icon} size={16} tone="primary" strokeWidth={2} />
      <Text size={11} leading={1} weight="500" align="center" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
});

const InlineCount = memo(function InlineCount({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <Text size={11} leading={1} tone="muted">
      {`${value} ${label}`}
    </Text>
  );
});

const ActivityRow = memo(function ActivityRow({
  action,
  label,
  detail,
  when,
}: {
  action: string;
  label: string;
  detail: string;
  when: string;
}) {
  return (
    <View style={styles.activityRow}>
      <AdminBadge
        label={action}
        tone={action === 'delete' ? 'danger' : action === 'insert' ? 'success' : 'neutral'}
      />
      <View style={styles.activityBody}>
        <Text size={fontSize.caption} leading={1.2} numberOfLines={1}>
          {label}
        </Text>
        <Text size={10.5} leading={1.2} tone="faint" numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Text size={10.5} leading={1} tone="dim">
        {when}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: 9,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: radius.control,
  },
  inlineCounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  activityBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  emptyActivity: {
    padding: 14,
  },
  pressed: {
    opacity: 0.72,
  },
});
