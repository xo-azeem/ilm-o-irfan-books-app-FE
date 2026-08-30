import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
  AdminDivider,
  AdminErrorState,
  AdminField,
  AdminHelper,
  AdminNavRow,
  AdminToggleRow,
} from '@/features/admin/components/AdminUi';
import { useAdminCollections, useAdminSettings, useUpdateAdminSettings } from '@/hooks/useAdmin';
import { layout } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

export function AdminSettingsScreen() {
  const { colors } = useTheme();
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
        <ListRowsSkeleton count={5} />
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
    <Screen padding={layout.adminPadding} gap={15}>
      <AdminBackLink label="System" />
      <ScreenHeader dense title="Settings" subtitle="Product flags that apply to every reader." />

      <View style={settingsStyles.stack}>
        <AdminCard title="Access">
          <View style={settingsStyles.group}>
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
              <View style={[settingsStyles.caution, { backgroundColor: colors.warningFill, borderColor: colors.warningBorder }]}>
                <Text size={12} leading={1.45} tone="warning">
                  Development setting. Turn this off before a public release so only subscribers can
                  read PDFs. The Edge Function also honours the ALLOW_PDF_WITHOUT_ENTITLEMENT
                  environment variable, which overrides this toggle when set.
                </Text>
              </View>
            ) : (
              <View style={settingsStyles.row}>
                <AdminBadge label="Subscription required" tone="success" />
                <Text size={12} leading={1.3} tone="muted">
                  Readers need an active entitlement.
                </Text>
              </View>
            )}

            <AdminDivider />

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
          <View style={settingsStyles.group}>
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
          <View style={settingsStyles.group}>
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

const settingsStyles = StyleSheet.create({
  stack: {
    gap: 22,
  },
  group: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  caution: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
