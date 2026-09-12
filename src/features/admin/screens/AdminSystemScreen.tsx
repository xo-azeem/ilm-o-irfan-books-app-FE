import { memo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChartNoAxesColumn,
  Clock,
  Database,
  Settings2,
} from 'lucide-react-native';

import { Screen } from '@/components/layout';
import { Label, Text } from '@/components/ui';
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

/**
 * System.
 *
 * The four things you visit weekly rather than hourly, each stating its own
 * state on the row — a menu that has to be opened to find out whether anything
 * is wrong is not a menu, it is four more taps.
 */
export function AdminSystemScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AdminSystemStackParamList>>();

  const email = useAuthStore(state => state.email);
  const signOut = useAuthStore(state => state.signOut);

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
    Alert.alert(
      'Sign out of admin',
      'You will land back on the sign-in screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            void signOut();
          },
        },
      ],
    );
  };

  return (
    <Screen padding={ADMIN_GUTTER} gap={17}>
      <AdminPageTitle
        title="System"
        subtitle={`Signed in as ${email || 'admin'}`}
      />

      <AdminRowGroup>
        <AdminNavRow
          label="Analytics"
          sublabel="Reading, signups, downloads"
          Icon={ChartNoAxesColumn}
          onPress={() => navigation.navigate(ADMIN_ROUTES.ANALYTICS)}
        />
        <AdminNavRow
          label="Storage"
          sublabel={
            orphans > 0
              ? `${orphans} ${orphans === 1 ? 'file is' : 'files are'} not linked to a book · ${formatBytes(
                  storageBytes,
                )} used`
              : `${formatBytes(storageBytes)} used · nothing to clean up`
          }
          warn={orphans > 0}
          Icon={Database}
          onPress={() => navigation.navigate(ADMIN_ROUTES.STORAGE)}
        />
        <AdminNavRow
          label="Change history"
          sublabel={
            lastChange
              ? `Last change ${formatRelative(lastChange.created_at)} by ${
                  lastChange.actor_email ?? 'system'
                }`
              : 'Nothing recorded yet'
          }
          Icon={Clock}
          onPress={() => navigation.navigate(ADMIN_ROUTES.HISTORY)}
        />
        <AdminNavRow
          label="App settings"
          sublabel={
            settings.data
              ? `${settings.data.signup_enabled ? 'Signups open' : 'Signups closed'} · ${
                  settings.data.maintenance_mode
                    ? 'maintenance on'
                    : 'maintenance off'
                }`
              : 'Availability, notices and versions'
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
        <AdminEyebrow>Health</AdminEyebrow>
        <AdminRowGroup>
          <HealthRow
            label="Database"
            state={stats.isError ? 'down' : stats.isLoading ? 'checking' : 'up'}
          />
          <HealthRow
            label="File storage"
            state={
              storage.isError ? 'down' : storage.isLoading ? 'checking' : 'up'
            }
          />
          <HealthRow
            label="App settings"
            state={
              settings.isError ? 'down' : settings.isLoading ? 'checking' : 'up'
            }
          />
        </AdminRowGroup>
      </View>

      <View style={styles.signOut}>
        <AdminButton
          label="Sign out of admin"
          variant="ghostDanger"
          onPress={handleSignOut}
        />
      </View>

      <Text size={11.5} leading={1.45} align="center" tone="dim">
        {`${stats.data?.user_count ?? 0} accounts · ${
          (stats.data?.book_published_count ?? 0) +
          (stats.data?.book_draft_count ?? 0)
        } titles · ${stats.data?.plan_count ?? 0} plans`}
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
          ? 'not responding'
          : state === 'checking'
            ? 'checking'
            : 'responding'}
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
