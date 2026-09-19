import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';

import { Icon, Label, SearchField, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminChipRow } from '@/features/admin/components/AdminControls';
import {
  AdminMenuSkeleton,
  AdminRowsSkeleton,
} from '@/features/admin/components/AdminSkeletons';
import { AdminDeletionRequests } from '@/features/admin/components/AdminDeletionRequests';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminAvatar,
  AdminDivider,
  AdminEmpty,
  AdminErrorState,
  AdminNewButton,
  AdminPageTitle,
  AdminSegments,
  AdminTag,
  AdminTextAction,
} from '@/features/admin/components/AdminUi';
import { formatDate, formatMoney } from '@/features/admin/utils/format';
import { useAppInsets } from '@/hooks/useAppInsets';
import { useAdminPlans, useAdminStats, useAdminUsers } from '@/hooks/useAdmin';
import { useAuthStore } from '@/stores/authStore';
import {
  EXPIRING_WINDOW_DAYS,
  type AdminPlan,
  type AdminUserFilters,
  type AdminUserRow,
} from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

import type {
  AdminPeopleStackParamList,
  PeopleSegment,
} from '../navigation/types';

const SEGMENTS: ReadonlyArray<{ value: PeopleSegment; label: string }> = [
  { value: 'readers', label: 'Readers' },
  { value: 'plans', label: 'Plans' },
  { value: 'deletions', label: 'Deletions' },
];

type AudienceFilter = 'everyone' | 'subscribers' | 'expiring' | 'admins';

const AUDIENCE_OPTIONS: Array<{ value: AudienceFilter; label: string }> = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'subscribers', label: 'Subscribers' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'admins', label: 'Admins' },
];

/** Each audience as the directory query understands it. */
const AUDIENCE_FILTERS: Record<
  AudienceFilter,
  Pick<AdminUserFilters, 'role' | 'access'>
> = {
  everyone: { role: 'all', access: 'all' },
  subscribers: { role: 'all', access: 'subscriber' },
  expiring: { role: 'all', access: 'expiring' },
  admins: { role: 'admin', access: 'all' },
};

/** Module-level so the list is not handed a new function every render. */
const keyExtractor = (item: AdminUserRow) => item.id;

/**
 * People.
 *
 * Readers and the plans behind their access, in one place — every question
 * about a person ends at their subscription, so the two were never really
 * separate screens. Access state is the first thing on each row, because it is
 * the reason support opened the list.
 *
 * The reader list is one list, paged from the server, with the whole
 * directory underneath it: the search field narrows it, the audience chips
 * narrow it further. Every filter is the database's, applied before the page
 * is cut, so the count under the field is the true number of matches and
 * paging a filtered list cannot repeat or skip a person. A new term does not
 * empty the list — the previous pages stand in until the first page of the
 * new one lands, so typing narrows the results in place.
 */
export function AdminPeopleScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AdminPeopleStackParamList>>();
  const route =
    useRoute<RouteProp<AdminPeopleStackParamList, 'AdminPeopleHome'>>();
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
  const currentUserId = useAuthStore(state => state.userId);

  const [segment, setSegment] = useState<PeopleSegment>(
    route.params?.segment ?? 'readers',
  );

  // The tab stays mounted, so a jump from Today or a tapped notification
  // has to push its segment in. The param is consumed and cleared, so the
  // same jump made twice — Deletions, back to Readers, Deletions again —
  // lands both times rather than only when the value changes.
  const routeSegment = route.params?.segment;
  useEffect(() => {
    if (routeSegment) {
      setSegment(routeSegment);
      navigation.setParams({ segment: undefined });
    }
  }, [navigation, routeSegment]);
  // The settled search term. The field owns the live text and holds each
  // keystroke back for its own beat, so this screen re-renders once per
  // search rather than once per character.
  const [term, setTerm] = useState('');
  const [audience, setAudience] = useState<AudienceFilter>('everyone');

  const filters = useMemo<AdminUserFilters>(
    () => ({ query: term, ...AUDIENCE_FILTERS[audience] }),
    [audience, term],
  );

  const users = useAdminUsers(filters);
  const plans = useAdminPlans();
  const { data: stats } = useAdminStats();

  const rows = useMemo(
    () => users.data?.pages.flatMap(page => page.rows) ?? [],
    [users.data],
  );

  /** The server's own count of the matches, not the pages fetched so far. */
  const matchCount = users.data?.pages[0]?.total ?? null;
  const narrowed = term.length > 0 || audience !== 'everyone';

  // `onEndReached` fires repeatedly through a momentum scroll. `cancelRefetch:
  // false` makes a second call while a page is in flight join that request
  // rather than abort and restart it. Placeholder data is never paged: its
  // `nextPage` belongs to the previous query.
  const { hasNextPage, isFetchingNextPage, isPlaceholderData, fetchNextPage } =
    users;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isPlaceholderData) {
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isPlaceholderData]);

  const openUser = useCallback(
    (userId: string) =>
      navigation.navigate(ADMIN_ROUTES.USER_DETAIL, { userId }),
    [navigation],
  );

  const activePlans = (plans.data ?? []).filter(plan => plan.is_active).length;

  const subtitle =
    segment === 'readers'
      ? `${stats?.user_count ?? 0} readers · ${stats?.subscriber_count ?? 0} subscribed · ${
          stats?.admin_count ?? 0
        } admins`
      : segment === 'plans'
        ? `${activePlans} ${activePlans === 1 ? 'plan' : 'plans'} live · ${
            stats?.subscriber_count ?? 0
          } subscribers`
        : 'Requests to delete an account, awaiting your decision';

  const renderUser = useCallback(
    ({ item }: { item: AdminUserRow }) => (
      <PersonRow
        user={item}
        isSelf={item.id === currentUserId}
        onPress={openUser}
      />
    ),
    [currentUserId, openUser],
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <AdminPageTitle
          title="People"
          subtitle={subtitle}
          action={
            segment === 'plans' ? (
              <AdminNewButton
                onPress={() =>
                  navigation.navigate(ADMIN_ROUTES.PLAN_EDITOR, {})
                }
              />
            ) : undefined
          }
        />

        <AdminSegments
          options={SEGMENTS}
          value={segment}
          onChange={setSegment}
        />

        {segment === 'readers' ? (
          <>
            <SearchField
              dense
              // The field leaves with its segment; it comes back showing the
              // term the list is still narrowed by.
              defaultValue={term}
              onSearch={setTerm}
              placeholder="Search by name, email or phone"
            />
            <AdminChipRow
              options={AUDIENCE_OPTIONS}
              value={audience}
              onChange={setAudience}
            />
            {narrowed || isPlaceholderData ? (
              <View style={styles.countRow}>
                {narrowed && matchCount != null ? (
                  <Text size={11.5} leading={1} tone="faint">
                    {matchCount === 1 ? '1 match' : `${matchCount} matches`}
                  </Text>
                ) : null}
                {isPlaceholderData ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      {segment === 'readers' ? (
        users.isPending ? (
          <View style={styles.gutter}>
            <AdminRowsSkeleton count={5} />
          </View>
        ) : users.error ? (
          <View style={styles.gutter}>
            <AdminErrorState
              message="The reader list could not be loaded."
              detail={errorMessage(users.error)}
              onRetry={() => void users.refetch()}
            />
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={keyExtractor}
            renderItem={renderUser}
            ItemSeparatorComponent={ListGap}
            // A new term's fetch also counts as a refetch while the old pages
            // stand in for it; that one is shown under the field, not as a pull.
            refreshing={users.isRefetching && !isPlaceholderData}
            onRefresh={() => void users.refetch()}
            // Well before the last row, so the next page lands under the
            // operator rather than after they hit the bottom and wait for it.
            onEndReachedThreshold={0.8}
            onEndReached={loadMore}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            windowSize={9}
            contentContainerStyle={{
              paddingHorizontal: ADMIN_GUTTER,
              paddingBottom: scrollEndPadding + 20,
            }}
            ListEmptyComponent={
              isPlaceholderData || isFetchingNextPage ? null : (
                <AdminEmpty
                  title={
                    audience === 'expiring'
                      ? 'Nothing expiring'
                      : 'No accounts match'
                  }
                  message={
                    audience === 'expiring'
                      ? `No subscription ends within ${EXPIRING_WINDOW_DAYS} days or is in billing trouble${
                          term ? ` for “${term}”` : ''
                        }.`
                      : term
                        ? `Nothing matched “${term}”. Try a different name, email or phone.`
                        : 'Try a different search term, or switch back to Everyone.'
                  }
                />
              )
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator
                  style={styles.footer}
                  color={colors.primary}
                />
              ) : null
            }
            style={styles.grow}
          />
        )
      ) : segment === 'deletions' ? (
        <AdminDeletionRequests bottomPadding={scrollEndPadding + 20} />
      ) : plans.isLoading ? (
        <View style={styles.gutter}>
          <AdminMenuSkeleton count={3} height={140} />
        </View>
      ) : plans.error ? (
        <View style={styles.gutter}>
          <AdminErrorState
            message="The plan list could not be loaded."
            detail={errorMessage(plans.error)}
            onRetry={() => void plans.refetch()}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.grow}
          contentContainerStyle={[
            styles.planList,
            { paddingBottom: scrollEndPadding + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {(plans.data ?? []).length === 0 ? (
            <AdminEmpty
              title="No plans yet"
              message="Define at least one plan so a store purchase maps to something readers recognise on the paywall."
              actionLabel="Add the first plan"
              onAction={() => navigation.navigate(ADMIN_ROUTES.PLAN_EDITOR, {})}
            />
          ) : (
            (plans.data ?? []).map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                lead={index === 0 && plan.is_active}
                onPress={() =>
                  navigation.navigate(ADMIN_ROUTES.PLAN_EDITOR, {
                    planId: plan.id,
                  })
                }
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ListGap() {
  return <View style={styles.listGap} />;
}

/** The one line under a name that says where this account stands. */
function describe(
  user: AdminUserRow,
  isSelf: boolean,
): { text: string; warn: boolean } {
  if (user.entitlement_status === 'billing_issue') {
    return {
      text: user.expires_at
        ? `Payment failed · access ends ${formatDate(user.expires_at)}`
        : 'Payment failed',
      warn: true,
    };
  }
  if (isSelf) {
    return { text: `${user.email ?? 'No email'} · that's you`, warn: false };
  }
  if (user.is_subscriber && user.expires_at) {
    return {
      text: `${user.email ?? 'No email'} · renews ${formatDate(user.expires_at)}`,
      warn: false,
    };
  }
  return {
    text: `${user.email ?? 'No email'} · joined ${formatDate(user.created_at)}`,
    warn: false,
  };
}

const PersonRow = memo(function PersonRow({
  user,
  isSelf,
  onPress,
}: {
  user: AdminUserRow;
  isSelf: boolean;
  onPress: (userId: string) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onPress(user.id), [onPress, user.id]);

  const isAdmin = user.role === 'admin';
  const trouble = user.entitlement_status === 'billing_issue';
  const line = describe(user, isSelf);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={user.full_name || user.email || 'Reader'}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.personRow,
        {
          backgroundColor: colors.surface,
          borderColor: trouble ? colors.warningBorder : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <AdminAvatar
        name={user.full_name ?? user.email ?? '?'}
        size={38}
        tone={
          trouble
            ? 'warning'
            : isAdmin || user.is_subscriber
              ? 'primary'
              : 'neutral'
        }
      />

      <View style={styles.personBody}>
        <View style={styles.nameRow}>
          <Text
            size={14}
            leading={1.2}
            weight="500"
            numberOfLines={1}
            style={styles.shrink}
          >
            {user.full_name || user.email || 'Unnamed reader'}
          </Text>
          {isAdmin ? (
            <AdminTag label="ADMIN" tone="success" small />
          ) : trouble ? (
            <AdminTag label="BILLING" tone="warning" small />
          ) : user.is_subscriber ? (
            <AdminTag
              label={(user.plan_name ?? 'Premium').toUpperCase()}
              tone="premium"
              small
            />
          ) : (
            <AdminTag label="FREE" tone="neutral" small />
          )}
        </View>

        <Text
          size={11}
          leading={1.2}
          tone={line.warn ? 'warning' : 'faint'}
          numberOfLines={1}
        >
          {line.text}
        </Text>
      </View>

      <Icon icon={ChevronRight} size={15} color={colors.dim} strokeWidth={2} />
    </Pressable>
  );
});

const INTERVAL_LABEL: Record<AdminPlan['interval'], string> = {
  month: 'per month',
  year: 'per year',
  lifetime: 'once',
};

const PlanCard = memo(function PlanCard({
  plan,
  lead,
  onPress,
}: {
  plan: AdminPlan;
  /** The plan an operator reaches for first carries a green rim. */
  lead: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={plan.name}
      onPress={onPress}
      style={({ pressed }) => [
        styles.planCard,
        {
          backgroundColor: colors.surface,
          borderColor: lead ? colors.selectedBorder : colors.border,
        },
        !plan.is_active && styles.dimmed,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.planHeader}>
        <View style={styles.grow}>
          <View style={styles.nameRow}>
            <Text
              size={17}
              leading={1.2}
              weight="500"
              numberOfLines={1}
              style={styles.shrink}
            >
              {plan.name}
            </Text>
            {!plan.is_active ? (
              <AdminTag label="OFF SALE" tone="neutral" small />
            ) : null}
          </View>
          <Label
            size={11}
            leading={1.2}
            weight="400"
            tracking={0}
            uppercase={false}
            tone="faint"
            numberOfLines={1}
          >
            {[plan.code, plan.revenuecat_product_id]
              .filter(Boolean)
              .join(' · ')}
          </Label>
        </View>

        <View style={styles.planPrice}>
          <Text size={19} leading={1} weight="700" align="right">
            {formatMoney(plan.price_cents, plan.currency)}
          </Text>
          <Text size={10.5} leading={1} tone="muted" align="right">
            {INTERVAL_LABEL[plan.interval]}
          </Text>
        </View>
      </View>

      {plan.features.length > 0 ? (
        <View style={styles.features}>
          {plan.features.map(feature => (
            <View
              key={feature}
              style={[styles.feature, { backgroundColor: colors.control }]}
            >
              <Text size={11} leading={1} tone="soft">
                {feature}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text size={11.5} leading={1.4} tone="warning">
          No benefits listed — the paywall will show an empty card.
        </Text>
      )}

      <AdminDivider />

      <View style={styles.planFooter}>
        <Text
          size={11.5}
          leading={1.4}
          tone={plan.is_active ? 'action' : 'muted'}
          style={styles.shrink}
        >
          {plan.is_active
            ? 'Offered on the paywall'
            : 'Hidden from the paywall. Existing holders keep their access.'}
        </Text>
        <AdminTextAction label="Edit" onPress={onPress} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 13,
  },
  gutter: {
    paddingHorizontal: ADMIN_GUTTER,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 16,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  shrink: {
    flexShrink: 1,
  },
  listGap: {
    height: 9,
  },
  footer: {
    paddingVertical: 20,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  personBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  planList: {
    paddingHorizontal: ADMIN_GUTTER,
    gap: 11,
  },
  planCard: {
    gap: 12,
    padding: 15,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  planPrice: {
    alignItems: 'flex-end',
    gap: 4,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  feature: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  planFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dimmed: {
    opacity: 0.62,
  },
  pressed: {
    opacity: 0.78,
  },
});
