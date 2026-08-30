import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChartNoAxesColumn,
  CreditCard,
  HardDrive,
  ScrollText,
  Settings2,
} from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { IconTile, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import {
  AdminBadge,
  AdminCard,
  AdminNavRow,
  AdminRowGroup,
} from '@/features/admin/components/AdminUi';
import { formatBytes } from '@/features/admin/utils/format';
import { useAdminPlans, useAdminSettings, useStorageAudit } from '@/hooks/useAdmin';
import { layout, radius } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminSystemStackParamList } from '../navigation/types';

/**
 * System.
 *
 * Pricing, analytics, storage and product flags. The dev-mode banner is
 * deliberately loud: shipping with the paywall off is the single most expensive
 * mistake this panel can hide.
 */
export function AdminSystemScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminSystemStackParamList>>();
  const { colors } = useTheme();
  const { data: settings } = useAdminSettings();
  const { data: plans = [] } = useAdminPlans();
  const { data: storage } = useStorageAudit();

  const storageBytes = (storage?.totals.covers_bytes ?? 0) + (storage?.totals.pdfs_bytes ?? 0);
  const issues = (storage?.orphans.length ?? 0) + (storage?.broken.length ?? 0);

  return (
    <Screen padding={layout.adminPadding} gap={15}>
      <ScreenHeader
        title="System"
        dense
        subtitle="Pricing, analytics, storage, and product flags."
      />

      {settings?.allow_pdf_without_entitlement ? (
        <View
          style={[
            styles.devBanner,
            { backgroundColor: colors.warningFill, borderColor: colors.warningBorder },
          ]}>
          <View style={styles.devHeader}>
            <AdminBadge label="Dev mode" tone="warning" />
            <Text size={13.5} leading={1} weight="600">
              Paywall is off
            </Text>
          </View>
          <Text size={11.5} leading={1.45} tone="muted">
            Any signed-in reader can open and download every PDF. Turn “Free PDF access” off in
            Settings before release.
          </Text>
        </View>
      ) : null}

      <AdminRowGroup>
        <AdminNavRow
          label="Analytics"
          onPress={() => navigation.navigate(ADMIN_ROUTES.ANALYTICS)}
          leading={<IconTile icon={ChartNoAxesColumn} tileTone="primary" tileSize={30} size={14} />}
        />
        <AdminNavRow
          label="Plans & pricing"
          value={`${plans.filter(plan => plan.is_active).length} active`}
          onPress={() => navigation.navigate(ADMIN_ROUTES.PLAN_LIST)}
          leading={<IconTile icon={CreditCard} tileTone="lime" tileSize={30} size={14} />}
        />
        <AdminNavRow
          label="Media library"
          value={issues > 0 ? `${issues} to review` : formatBytes(storageBytes)}
          onPress={() => navigation.navigate(ADMIN_ROUTES.MEDIA)}
          leading={
            <IconTile
              icon={HardDrive}
              tileTone={issues > 0 ? 'warning' : 'primary'}
              tileSize={30}
              size={14}
            />
          }
        />
        <AdminNavRow
          label="Audit log"
          onPress={() => navigation.navigate(ADMIN_ROUTES.AUDIT_LOG)}
          leading={<IconTile icon={ScrollText} tileTone="neutral" tileSize={30} size={14} />}
        />
        <AdminNavRow
          label="Settings"
          onPress={() => navigation.navigate(ADMIN_ROUTES.SETTINGS)}
          leading={<IconTile icon={Settings2} tileTone="neutral" tileSize={30} size={14} />}
        />
      </AdminRowGroup>

      <AdminCard title="Storage">
        <StorageRow
          label="Covers"
          value={`${storage?.totals.covers_count ?? 0} files · ${formatBytes(
            storage?.totals.covers_bytes ?? 0,
          )}`}
        />
        <StorageRow
          label="PDFs"
          value={`${storage?.totals.pdfs_count ?? 0} files · ${formatBytes(
            storage?.totals.pdfs_bytes ?? 0,
          )}`}
        />
        <StorageRow
          label="Unreferenced files"
          value={String(storage?.orphans.length ?? 0)}
          warn={(storage?.orphans.length ?? 0) > 0}
        />
        <StorageRow
          label="Books with a missing file"
          value={String(storage?.broken.length ?? 0)}
          warn={(storage?.broken.length ?? 0) > 0}
        />
      </AdminCard>
    </Screen>
  );
}

const StorageRow = memo(function StorageRow({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: string;
  /** A non-zero problem count reads amber, matching the rest of admin. */
  warn?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text size={13} leading={1} tone="muted">
        {label}
      </Text>
      <Text size={13} leading={1} weight="500" tone={warn ? 'warning' : 'ink'}>
        {value}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  devBanner: {
    padding: 13,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: 6,
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});
