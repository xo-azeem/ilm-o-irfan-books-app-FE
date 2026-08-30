import { Alert, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BookPlus,
  ChartNoAxesColumn,
  FileWarning,
  ImageOff,
  Library,
  Users,
} from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { AdminStatsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import {
  AdminBadge,
  AdminCard,
  AdminErrorState,
  AdminStat,
  AdminTextAction,
  useAdminRefresh,
  WARNING,
} from '@/features/admin/components/AdminUi';
import { formatRelative } from '@/features/admin/utils/format';
import { useAdminStats, useAuditLog } from '@/hooks/useAdmin';
import { errorMessage } from '@/features/admin/components/AdminToast';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminTabParamList } from '../navigation/types';

type Nav = {
  navigate: <T extends keyof AdminTabParamList>(
    screen: T,
    params?: AdminTabParamList[T],
  ) => void;
};

export function AdminOverviewScreen() {
  const navigation = useNavigation() as unknown as Nav;
  const { colors } = useTheme();
  const email = useAuthStore(state => state.email);
  const signOut = useAuthStore(state => state.signOut);

  const { data, isLoading, error, refetch, isRefetching } = useAdminStats();
  const refreshProps = useAdminRefresh(isRefetching, () => {
    void refetch();
  });
  const audit = useAuditLog(null);
  const recent = audit.data?.pages[0]?.rows.slice(0, 5) ?? [];

  const needsAttention =
    (data?.missing_pdf_count ?? 0) + (data?.missing_cover_count ?? 0) > 0;

  const goToBooks = (status?: 'draft' | 'incomplete') =>
    navigation.navigate(ADMIN_ROUTES.BOOKS, {
      screen: ADMIN_ROUTES.BOOK_LIST,
      params: status ? { status } : undefined,
    });

  return (
    <Screen scrollViewProps={refreshProps}>
      <ScreenHeader
        title="Overview"
        subtitle="Catalog health, readers, and subscriptions."
        action={
          <AdminTextAction
            label="Sign out"
            onPress={() =>
              Alert.alert('Sign out', 'Leave the admin panel?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign out',
                  style: 'destructive',
                  onPress: () => {
                    void signOut();
                  },
                },
              ])
            }
          />
        }
      />

      <Text className="mb-5 text-[13px] text-app-muted dark:text-app-muted-dark">
        Signed in as {email || 'admin'}
      </Text>

      {needsAttention ? (
        <Pressable
          onPress={() => goToBooks('incomplete')}
          className="mb-5 flex-row items-center gap-3 rounded-[16px] p-4 active:opacity-70"
          style={{ backgroundColor: `${WARNING}1A`, borderWidth: 1, borderColor: `${WARNING}44` }}>
          <FileWarning size={20} color={WARNING} strokeWidth={2.1} />
          <View className="min-w-0 flex-1">
            <Text className="text-[14px] font-semibold" style={{ color: WARNING }}>
              {data?.missing_pdf_count ?? 0} titles without a PDF,{' '}
              {data?.missing_cover_count ?? 0} without a cover
            </Text>
            <Text className="text-[12px] text-app-muted dark:text-app-muted-dark">
              Tap to review incomplete titles.
            </Text>
          </View>
        </Pressable>
      ) : null}

      <View className="mb-6 gap-3">
        <Text className="px-1 text-[12px] font-semibold uppercase tracking-widest text-app-muted dark:text-app-muted-dark">
          Quick actions
        </Text>
        <View className="flex-row flex-wrap gap-3">
          <QuickAction
            label="New book"
            Icon={BookPlus}
            onPress={() =>
              navigation.navigate(ADMIN_ROUTES.BOOKS, {
                screen: ADMIN_ROUTES.BOOK_EDITOR,
                params: {},
              })
            }
          />
          <QuickAction
            label="Catalog"
            Icon={Library}
            onPress={() => navigation.navigate(ADMIN_ROUTES.CATALOG)}
          />
          <QuickAction
            label="People"
            Icon={Users}
            onPress={() => navigation.navigate(ADMIN_ROUTES.PEOPLE)}
          />
          <QuickAction
            label="Analytics"
            Icon={ChartNoAxesColumn}
            onPress={() =>
              navigation.navigate(ADMIN_ROUTES.SYSTEM, { screen: ADMIN_ROUTES.ANALYTICS })
            }
          />
        </View>
      </View>

      {isLoading ? (
        <AdminStatsSkeleton />
      ) : error ? (
        <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <>
          <View className="mb-6 gap-3">
            <Text className="px-1 text-[12px] font-semibold uppercase tracking-widest text-app-muted dark:text-app-muted-dark">
              Last 7 days
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <AdminStat label="New readers" value={data?.signups_7d ?? 0} tone="success" />
              <AdminStat label="Reading sessions" value={data?.reads_7d ?? 0} />
              <AdminStat label="Downloads" value={data?.downloads_7d ?? 0} />
            </View>
          </View>

          <View className="mb-6 gap-3">
            <Text className="px-1 text-[12px] font-semibold uppercase tracking-widest text-app-muted dark:text-app-muted-dark">
              Audience
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <AdminStat
                label="Users"
                value={data?.user_count ?? 0}
                onPress={() => navigation.navigate(ADMIN_ROUTES.PEOPLE)}
              />
              <AdminStat label="Subscribers" value={data?.subscriber_count ?? 0} tone="accent" />
              <AdminStat label="Free readers" value={data?.guest_signed_in_count ?? 0} />
              <AdminStat label="Admins" value={data?.admin_count ?? 0} />
            </View>
          </View>

          <View className="mb-6 gap-3">
            <Text className="px-1 text-[12px] font-semibold uppercase tracking-widest text-app-muted dark:text-app-muted-dark">
              Catalog
            </Text>
            <View className="flex-row flex-wrap gap-3">
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
              <AdminStat label="Authors" value={data?.author_count ?? 0} />
              <AdminStat label="Categories" value={data?.category_count ?? 0} />
              <AdminStat label="Collections" value={data?.collection_count ?? 0} />
              <AdminStat label="Active plans" value={data?.plan_count ?? 0} />
            </View>
          </View>

          <View className="mb-6 flex-row flex-wrap gap-3">
            <IssueTile
              label="Missing PDF"
              value={data?.missing_pdf_count ?? 0}
              Icon={FileWarning}
              onPress={() => goToBooks('incomplete')}
            />
            <IssueTile
              label="Missing cover"
              value={data?.missing_cover_count ?? 0}
              Icon={ImageOff}
              onPress={() => goToBooks('incomplete')}
            />
          </View>
        </>
      )}

      <AdminCard
        title="Recent activity"
        padded={false}
        action={
          <AdminTextAction
            label="View all"
            onPress={() =>
              navigation.navigate(ADMIN_ROUTES.SYSTEM, { screen: ADMIN_ROUTES.AUDIT_LOG })
            }
          />
        }>
        {recent.length === 0 ? (
          <Text className="p-4 text-[13px] text-app-muted dark:text-app-muted-dark">
            No admin changes recorded yet.
          </Text>
        ) : (
          recent.map((entry, index) => (
            <View
              key={entry.id}
              className={`flex-row items-center gap-3 px-4 py-3 ${
                index === recent.length - 1
                  ? ''
                  : 'border-b border-app-border dark:border-app-border-dark'
              }`}>
              <AdminBadge
                label={entry.action}
                tone={
                  entry.action === 'delete'
                    ? 'danger'
                    : entry.action === 'insert'
                    ? 'success'
                    : 'neutral'
                }
              />
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[14px] text-app-ink dark:text-app-ink-dark"
                  numberOfLines={1}>
                  {entry.entity_label ?? entry.entity_type}
                </Text>
                <Text
                  className="text-[11px] text-app-muted dark:text-app-muted-dark"
                  numberOfLines={1}>
                  {entry.entity_type} · {entry.actor_email ?? 'system'}
                </Text>
              </View>
              <Text className="text-[11px]" style={{ color: colors.faint }}>
                {formatRelative(entry.created_at)}
              </Text>
            </View>
          ))
        )}
      </AdminCard>
    </Screen>
  );
}

function QuickAction({
  label,
  Icon,
  onPress,
}: {
  label: string;
  Icon: typeof BookPlus;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      className="min-w-[46%] flex-1 flex-row items-center gap-2.5 rounded-[14px] bg-app-surface px-4 py-3.5 active:opacity-70 dark:bg-app-surface-dark">
      <Icon size={19} color={colors.primary} strokeWidth={2.1} />
      <Text className="text-[14px] font-medium text-app-ink dark:text-app-ink-dark">{label}</Text>
    </Pressable>
  );
}

function IssueTile({
  label,
  value,
  Icon,
  onPress,
}: {
  label: string;
  value: number;
  Icon: typeof FileWarning;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const tone = value > 0 ? WARNING : colors.faint;
  return (
    <Pressable
      onPress={onPress}
      className="min-w-[46%] flex-1 flex-row items-center gap-3 rounded-[14px] bg-app-surface p-4 active:opacity-70 dark:bg-app-surface-dark">
      <Icon size={19} color={tone} strokeWidth={2.1} />
      <View className="min-w-0 flex-1">
        <Text className="text-[18px] font-bold" style={{ color: tone }}>
          {value}
        </Text>
        <Text className="text-[11px] text-app-muted dark:text-app-muted-dark">{label}</Text>
      </View>
    </Pressable>
  );
}
