import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChartNoAxesColumn,
  Clock,
  Database,
  LogOut,
  Settings2,
  Smartphone,
} from 'lucide-react-native';

import { Screen } from '@/components/layout';
import { Label, showDialog, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import {
  ADMIN_GUTTER,
  AdminButton,
  AdminEyebrow,
  AdminNavRow,
  AdminPageTitle,
  AdminRowGroup,
} from '@/features/admin/components/AdminUi';
import { formatBytes, formatRelative } from '@/features/admin/utils/format';
import {
  useAdminSettings,
  useAdminStats,
  useAuditLog,
  useStorageAudit,
} from '@/hooks/useAdmin';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminSystemStackParamList } from '../navigation/types';
import { useStrings } from '@/i18n';

/**
 * System.
 *
 * The four things you visit weekly rather than hourly, each stating its own
 * state on the row — a menu that has to be opened to find out whether anything
 * is wrong is not a menu, it is four more taps.
 */
export function AdminSystemScreen() {
  const s = useStrings();
  const words = s.admin.system;
  const navigation =
    useNavigation<NativeStackNavigationProp<AdminSystemStackParamList>>();

  const email = useAuthStore(state => state.email);
  const signOut = useAuthStore(state => state.signOut);
  const setViewingAsReader = useAuthStore(state => state.setViewingAsReader);

  const stats = useAdminStats();
  const storage = useStorageAudit();
  const settings = useAdminSettings();
  const audit = useAuditLog(null);

  const orphans = storage.data?.orphans.length ?? 0;
  const storageBytes =
    (storage.data?.totals.covers_bytes ?? 0) +
    (storage.data?.totals.pdfs_bytes ?? 0);
  const lastChange = audit.data?.pages[0]?.rows[0];

  const handleSignOut = () => {
    showDialog({
      title: words.signOutTitle,
      message: words.signOutMessage,
      icon: LogOut,
      actions: [
        { label: s.admin.ui.cancel, style: 'cancel' },
        {
          label: words.signOut,
          style: 'destructive',
          onPress: () => {
            void signOut();
          },
        },
      ],
    });
  };

  return (
    <Screen padding={ADMIN_GUTTER} gap={17}>
      <AdminPageTitle
        title={words.title}
        subtitle={words.signedInAs(email || s.admin.ui.admin)}
      />

      <AdminRowGroup>
        <AdminNavRow
          label={words.analytics}
          sublabel={words.analyticsHint}
          Icon={ChartNoAxesColumn}
          onPress={() => navigation.navigate(ADMIN_ROUTES.ANALYTICS)}
        />
        <AdminNavRow
          label={words.storage}
          sublabel={
            orphans > 0
              ? words.storageOrphans(orphans, formatBytes(storageBytes))
              : words.storageClean(formatBytes(storageBytes))
          }
          warn={orphans > 0}
          Icon={Database}
          onPress={() => navigation.navigate(ADMIN_ROUTES.STORAGE)}
        />
        <AdminNavRow
          label={words.history}
          sublabel={
            lastChange
              ? words.lastChange(
                  formatRelative(lastChange.created_at),
                  lastChange.actor_email ?? s.admin.ui.system,
                )
              : words.nothingRecorded
          }
          Icon={Clock}
          onPress={() => navigation.navigate(ADMIN_ROUTES.HISTORY)}
        />
        <AdminNavRow
          label={words.appSettings}
          sublabel={
            settings.data
              ? words.settingsSummary(
                  settings.data.signup_enabled,
                  settings.data.maintenance_mode,
                )
              : words.settingsHint
          }
          warn={settings.data?.maintenance_mode ?? false}
          Icon={Settings2}
          onPress={() => navigation.navigate(ADMIN_ROUTES.SETTINGS)}
        />
      </AdminRowGroup>

      {/*
        Health, read from this session's own requests rather than a probe: if
        the panel could fetch it, the service answered. It is a weaker claim
        than a status page and a truthful one.
      */}
      <View style={styles.block}>
        <AdminEyebrow>{words.health}</AdminEyebrow>
        <AdminRowGroup>
          <HealthRow
            label={words.database}
            state={stats.isError ? 'down' : stats.isLoading ? 'checking' : 'up'}
          />
          <HealthRow
            label={words.fileStorage}
            state={
              storage.isError ? 'down' : storage.isLoading ? 'checking' : 'up'
            }
          />
          <HealthRow
            label={words.appSettings}
            state={
              settings.isError ? 'down' : settings.isLoading ? 'checking' : 'up'
            }
          />
        </AdminRowGroup>
      </View>

      {/* This account, as a reader. The same row as on Today, here because
          this is where the account's other action — leaving — lives. */}
      <View style={styles.block}>
        <AdminEyebrow>{words.account}</AdminEyebrow>
        <AdminRowGroup>
          <AdminNavRow
            label={s.admin.today.openAsReader}
            sublabel={words.comeBack}
            Icon={Smartphone}
            onPress={() => setViewingAsReader(true)}
          />
        </AdminRowGroup>
      </View>

      <View style={styles.signOut}>
        <AdminButton
          label={words.signOutTitle}
          variant="ghostDanger"
          onPress={handleSignOut}
        />
      </View>

      <Text size={11.5} leading={1.45} align="center" tone="dim">
        {words.footer(
          stats.data?.user_count ?? 0,
          (stats.data?.book_published_count ?? 0) +
            (stats.data?.book_draft_count ?? 0),
          stats.data?.plan_count ?? 0,
        )}
      </Text>
    </Screen>
  );
}

const HealthRow = memo(function HealthRow({
  label,
  state,
}: {
  label: string;
  state: 'up' | 'down' | 'checking';
}) {
  const { colors } = useTheme();
  const s = useStrings();

  const dot =
    state === 'down'
      ? colors.danger
      : state === 'checking'
        ? colors.warning
        : colors.primaryBright;

  return (
    <View style={styles.healthRow}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text size={13.5} leading={1.2} style={styles.grow}>
        {label}
      </Text>
      <Label
        size={11}
        leading={1}
        weight="400"
        tracking={0.4}
        tone={state === 'down' ? 'danger' : 'faint'}
      >
        {state === 'down'
          ? s.admin.system.notResponding
          : state === 'checking'
            ? s.admin.system.checking
            : s.admin.system.responding}
      </Label>
    </View>
  );
});

const styles = StyleSheet.create({
  block: {
    gap: 9,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  signOut: {
    marginTop: 6,
  },
});
