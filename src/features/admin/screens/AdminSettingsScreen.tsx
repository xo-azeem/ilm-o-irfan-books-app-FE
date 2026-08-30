import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Text } from '@/components/ui';
import { AdminPickerSheet } from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminErrorState,
  AdminField,
  AdminHelper,
  AdminNavRow,
  AdminToggleRow,
  WARNING,
} from '@/features/admin/components/AdminUi';
import { useAdminCollections, useAdminSettings, useUpdateAdminSettings } from '@/hooks/useAdmin';

export function AdminSettingsScreen() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useAdminSettings();
  const { data: collections = [] } = useAdminCollections();
  const update = useUpdateAdminSettings();

  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [minVersion, setMinVersion] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);

  useEffect(() => {
    if (!data) return;
    setMaintenanceMessage(data.maintenance_message ?? '');
    setMinVersion(data.min_supported_version ?? '');
    setSupportEmail(data.support_email ?? '');
  }, [data]);

  const save = (patch: Parameters<typeof update.mutate>[0], successMessage: string) => {
    update.mutate(patch, {
      onSuccess: () => toast.success(successMessage),
      onError: caught => toast.error(errorMessage(caught)),
    });
  };

  if (isLoading) {
    return (
      <Screen>
        <AdminBackLink label="System" />
        <ListRowsSkeleton rows={5} />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <AdminBackLink label="System" />
        <AdminErrorState
          message={error ? errorMessage(error) : 'Settings row is missing.'}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const featured = collections.find(item => item.id === data.featured_collection_id);

  return (
    <Screen>
      <AdminBackLink label="System" />
      <ScreenHeader title="Settings" subtitle="Product flags that apply to every reader." />

      <View className="gap-6">
        <AdminCard title="Access">
          <View className="gap-3">
            <AdminToggleRow
              label="Free PDF access"
              description="When on, any signed-in reader can open and download every book without a subscription. Admins always can."
              value={data.allow_pdf_without_entitlement}
              disabled={update.isPending}
              onValueChange={value =>
                save(
                  { allow_pdf_without_entitlement: value },
                  value ? 'Paywall disabled.' : 'Paywall enabled — subscription now required.',
                )
              }
            />
            {data.allow_pdf_without_entitlement ? (
              <View className="rounded-[10px] px-3 py-2.5" style={{ backgroundColor: `${WARNING}1A` }}>
                <Text className="text-[12px] leading-[17px]" style={{ color: WARNING }}>
                  Development setting. Turn this off before a public release so only subscribers can
                  read PDFs. The Edge Function also honours the ALLOW_PDF_WITHOUT_ENTITLEMENT
                  environment variable, which overrides this toggle when set.
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <AdminBadge label="Subscription required" tone="success" />
                <Text className="text-[12px] text-app-muted dark:text-app-muted-dark">
                  Readers need an active entitlement.
                </Text>
              </View>
            )}

            <View className="h-px bg-app-border dark:bg-app-border-dark" />

            <AdminToggleRow
              label="Sign-ups open"
              description="Turn off to stop new accounts being created."
              value={data.signup_enabled}
              disabled={update.isPending}
              onValueChange={value =>
                save({ signup_enabled: value }, value ? 'Sign-ups open.' : 'Sign-ups closed.')
              }
            />
          </View>
        </AdminCard>

        <AdminCard title="Maintenance">
          <View className="gap-3">
            <AdminToggleRow
              label="Maintenance mode"
              description="Show a notice instead of the catalog."
              value={data.maintenance_mode}
              disabled={update.isPending}
              onValueChange={value =>
                save(
                  { maintenance_mode: value },
                  value ? 'Maintenance mode on.' : 'Maintenance mode off.',
                )
              }
            />
            <AdminField
              label="Notice"
              value={maintenanceMessage}
              onChangeText={setMaintenanceMessage}
              multiline
              placeholder="We are updating the library. Back shortly."
            />
            <AdminButton
              label="Save notice"
              variant="secondary"
              compact
              disabled={update.isPending}
              onPress={() =>
                save({ maintenance_message: maintenanceMessage || null }, 'Notice saved.')
              }
            />
          </View>
        </AdminCard>

        <AdminCard title="Merchandising" padded={false}>
          <AdminNavRow
            label="Featured collection"
            value={featured?.title ?? 'None'}
            isLast
            onPress={() => setShowCollectionPicker(true)}
          />
        </AdminCard>

        <AdminCard title="App">
          <View className="gap-3">
            <AdminField
              label="Minimum supported version"
              value={minVersion}
              onChangeText={setMinVersion}
              placeholder="1.0.0"
              autoCapitalize="none"
            />
            <AdminField
              label="Support email"
              value={supportEmail}
              onChangeText={setSupportEmail}
              placeholder="support@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <AdminButton
              label={update.isPending ? 'Saving…' : 'Save app settings'}
              loading={update.isPending}
              onPress={() =>
                save(
                  {
                    min_supported_version: minVersion || null,
                    support_email: supportEmail || null,
                  },
                  'App settings saved.',
                )
              }
            />
            <AdminHelper>
              Every change here is recorded in the audit log with your account and a timestamp.
            </AdminHelper>
          </View>
        </AdminCard>
      </View>

      <AdminPickerSheet
        visible={showCollectionPicker}
        title="Featured collection"
        items={[
          { id: '', label: 'None' },
          ...collections.map(collection => ({
            id: collection.id,
            label: collection.title,
            sublabel: `${collection.kind} · ${collection.book_count} books`,
            accent: collection.accent,
          })),
        ]}
        selected={data.featured_collection_id ? [data.featured_collection_id] : ['']}
        onClose={() => setShowCollectionPicker(false)}
        onChange={next =>
          save({ featured_collection_id: next[0] || null }, 'Featured collection updated.')
        }
      />
    </Screen>
  );
}
