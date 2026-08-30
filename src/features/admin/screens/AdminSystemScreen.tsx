import { View } from 'react-native';
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
import { Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminBadge, AdminCard, AdminNavRow } from '@/features/admin/components/AdminUi';
import { formatBytes } from '@/features/admin/utils/format';
import { useAdminPlans, useAdminSettings, useStorageAudit } from '@/hooks/useAdmin';

import type { AdminSystemStackParamList } from '../navigation/types';

export function AdminSystemScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminSystemStackParamList>>();
  const { data: settings } = useAdminSettings();
  const { data: plans = [] } = useAdminPlans();
  const { data: storage } = useStorageAudit();

  const storageBytes = (storage?.totals.covers_bytes ?? 0) + (storage?.totals.pdfs_bytes ?? 0);
  const issues = (storage?.orphans.length ?? 0) + (storage?.broken.length ?? 0);

  return (
    <Screen>
      <ScreenHeader title="System" subtitle="Pricing, analytics, storage, and product flags." />

      {settings?.allow_pdf_without_entitlement ? (
        <View className="mb-5">
          <AdminCard>
            <View className="gap-1.5">
              <View className="flex-row items-center gap-2">
                <AdminBadge label="Dev mode" tone="warning" />
                <Text className="text-[14px] font-semibold text-app-ink dark:text-app-ink-dark">
                  Paywall is off
                </Text>
              </View>
              <Text className="text-[13px] leading-[18px] text-app-muted dark:text-app-muted-dark">
                Any signed-in reader can open and download every PDF. Turn “Free PDF access” off in
                Settings to require an active subscription before release.
              </Text>
            </View>
          </AdminCard>
        </View>
      ) : null}

      <View className="gap-6">
        <AdminCard padded={false}>
          <AdminNavRow
            label="Analytics"
            Icon={ChartNoAxesColumn}
            onPress={() => navigation.navigate(ADMIN_ROUTES.ANALYTICS)}
          />
          <AdminNavRow
            label="Plans & pricing"
            value={`${plans.filter(plan => plan.is_active).length} active`}
            Icon={CreditCard}
            onPress={() => navigation.navigate(ADMIN_ROUTES.PLAN_LIST)}
          />
          <AdminNavRow
            label="Media library"
            value={issues > 0 ? `${issues} to review` : formatBytes(storageBytes)}
            Icon={HardDrive}
            onPress={() => navigation.navigate(ADMIN_ROUTES.MEDIA)}
          />
          <AdminNavRow
            label="Audit log"
            Icon={ScrollText}
            onPress={() => navigation.navigate(ADMIN_ROUTES.AUDIT_LOG)}
          />
          <AdminNavRow
            label="Settings"
            Icon={Settings2}
            isLast
            onPress={() => navigation.navigate(ADMIN_ROUTES.SETTINGS)}
          />
        </AdminCard>

        <AdminCard title="Storage">
          <View className="gap-2">
            <Row
              label="Covers"
              value={`${storage?.totals.covers_count ?? 0} files · ${formatBytes(
                storage?.totals.covers_bytes ?? 0,
              )}`}
            />
            <Row
              label="PDFs"
              value={`${storage?.totals.pdfs_count ?? 0} files · ${formatBytes(
                storage?.totals.pdfs_bytes ?? 0,
              )}`}
            />
            <Row label="Unreferenced files" value={String(storage?.orphans.length ?? 0)} />
            <Row label="Books with a missing file" value={String(storage?.broken.length ?? 0)} />
          </View>
        </AdminCard>
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">{label}</Text>
      <Text className="text-[14px] text-app-ink dark:text-app-ink-dark">{value}</Text>
    </View>
  );
}
