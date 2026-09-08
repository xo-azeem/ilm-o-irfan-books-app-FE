import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AdminPickerSheet } from '@/features/admin/components/AdminControls';
import { AdminMenuSkeleton } from '@/features/admin/components/AdminSkeletons';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminBackLink,
  AdminButton,
  AdminErrorState,
  AdminEyebrow,
  AdminField,
  AdminNavRow,
  AdminRowGroup,
  AdminScreenTitle,
  AdminTag,
  AdminToggleRow,
} from '@/features/admin/components/AdminUi';
import { useAppInsets } from '@/hooks/useAppInsets';
import { useAdminCollections, useAdminSettings, useUpdateAdminSettings } from '@/hooks/useAdmin';
import { useTheme } from '@/theme/ThemeContext';

/**
 * App settings.
 *
 * Every switch is written as what a reader will see, not as the column it
 * sets. There is deliberately no PDF-access switch: `get-signed-pdf` grants a
 * file to the admin role or an active entitlement and to nothing else, so
 * there is no flag here that could contradict it.
 */
export function AdminSettingsScreen() {
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
  const toast = useToast();

  const { data, isLoading, error, refetch } = useAdminSettings();
  const { data: collections = [] } = useAdminCollections();
  const update = useUpdateAdminSettings();

  const [form, setForm] = useState({
    maintenanceMode: false,
    maintenanceMessage: '',
    signupEnabled: true,
    minVersion: '',
    supportEmail: '',
    featuredCollectionId: null as string | null,
  });
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      maintenanceMode: data.maintenance_mode,
      maintenanceMessage: data.maintenance_message ?? '',
      signupEnabled: data.signup_enabled,
      minVersion: data.min_supported_version ?? '',
      supportEmail: data.support_email ?? '',
      featuredCollectionId: data.featured_collection_id,
    });
  }, [data]);

  const dirty = useMemo(() => {
    if (!data) return false;
    return (
      form.maintenanceMode !== data.maintenance_mode ||
      form.maintenanceMessage !== (data.maintenance_message ?? '') ||
      form.signupEnabled !== data.signup_enabled ||
      form.minVersion !== (data.min_supported_version ?? '') ||
      form.supportEmail !== (data.support_email ?? '') ||
      form.featuredCollectionId !== data.featured_collection_id
    );
  }, [data, form]);

  const featured = collections.find(item => item.id === form.featuredCollectionId);

  const handleSave = () => {
    update.mutate(
      {
        maintenance_mode: form.maintenanceMode,
        maintenance_message: form.maintenanceMessage || null,
        signup_enabled: form.signupEnabled,
        min_supported_version: form.minVersion || null,
        support_email: form.supportEmail || null,
        featured_collection_id: form.featuredCollectionId,
      },
      {
        onSuccess: () => toast.success('Settings saved.'),
        onError: caught => toast.error(errorMessage(caught)),
      },
    );
  };

  if (isLoading) {
    return (
      <Shell>
        <AdminMenuSkeleton count={4} height={72} />
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <AdminErrorState
          title="Couldn't load settings"
          message="The settings row did not come back. Nothing has been changed."
          detail={error ? errorMessage(error) : undefined}
          onRetry={() => void refetch()}
        />
      </Shell>
    );
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink
          label="System"
          action={dirty ? <AdminTag label="UNSAVED" tone="warning" /> : undefined}
        />
      </View>

      <ScrollView
        style={styles.grow}
        contentContainerStyle={{
          paddingHorizontal: ADMIN_GUTTER,
          paddingTop: 16,
          paddingBottom: scrollEndPadding + 80,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <AdminScreenTitle title="App settings" />

        <AdminRowGroup title="Availability">
          <View style={styles.settingRow}>
            <AdminToggleRow
              label="Maintenance mode"
              description={
                form.maintenanceMode
                  ? 'On — everyone sees the notice below instead of the app.'
                  : 'Off — the app opens normally for everyone.'
              }
              value={form.maintenanceMode}
              onValueChange={value => setForm(current => ({ ...current, maintenanceMode: value }))}
            />
          </View>
          <View style={styles.settingRow}>
            <AdminToggleRow
              label="New signups"
              description={
                form.signupEnabled
                  ? 'Open — anyone can create an account.'
                  : 'Closed — the sign-up form is hidden and existing accounts still work.'
              }
              value={form.signupEnabled}
              onValueChange={value => setForm(current => ({ ...current, signupEnabled: value }))}
            />
          </View>
        </AdminRowGroup>

        <AdminField
          label="Notice shown during maintenance"
          value={form.maintenanceMessage}
          onChangeText={value => setForm(current => ({ ...current, maintenanceMessage: value }))}
          multiline
          maxLength={240}
          placeholder="We're adding new titles. The library will be back within the hour."
        />

        <AdminRowGroup title="Home screen">
          <AdminNavRow
            label="Featured shelf"
            value={featured?.title ?? 'None'}
            onPress={() => setShowCollectionPicker(true)}
          />
        </AdminRowGroup>

        <View style={styles.block}>
          <AdminEyebrow>Support &amp; versions</AdminEyebrow>
          <AdminField
            label="Support email"
            value={form.supportEmail}
            onChangeText={value => setForm(current => ({ ...current, supportEmail: value }))}
            placeholder="help@ilmoirfan.pk"
            autoCapitalize="none"
            keyboardType="email-address"
            helper="Shown in the reader app's Help centre."
          />
          <AdminField
            label="Oldest allowed app version"
            value={form.minVersion}
            onChangeText={value => setForm(current => ({ ...current, minVersion: value }))}
            placeholder="1.2.0"
            autoCapitalize="none"
            mono
            helper="Older builds are asked to update before reading."
          />
        </View>

        <View style={[styles.note, { backgroundColor: colors.primaryFillSoft }]}>
          <Text size={11.5} leading={1.5} tone="muted">
            PDF access is decided by the reader's subscription at the moment they ask for a file.
            There is deliberately no switch here that could open the whole library by accident.
          </Text>
        </View>

        <Text size={11.5} leading={1.45} tone="faint">
          Every change here is written to the change history with your account and a timestamp.
        </Text>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.chrome, borderTopColor: colors.chromeBorder },
        ]}>
        <AdminButton
          label="Save settings"
          loading={update.isPending}
          disabled={!dirty}
          onPress={handleSave}
        />
      </View>

      <AdminPickerSheet
        visible={showCollectionPicker}
        title="Featured shelf"
        items={[
          { id: '', label: 'None' },
          ...collections.map(collection => ({
            id: collection.id,
            label: collection.title,
            sublabel: `${collection.kind} · ${collection.book_count} books`,
            accent: collection.accent,
          })),
        ]}
        selected={form.featuredCollectionId ? [form.featuredCollectionId] : ['']}
        onClose={() => setShowCollectionPicker(false)}
        onChange={next =>
          setForm(current => ({ ...current, featuredCollectionId: next[0] || null }))
        }
      />
    </SafeAreaView>
  );
}

/** The screen frame, reused by the loading and error states. */
function Shell({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink label="System" />
      </View>
      <View style={styles.shellBody}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  shellBody: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 16,
  },
  grow: { flex: 1 },
  block: { gap: 9 },
  settingRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  note: {
    padding: 14,
    borderRadius: 14,
  },
  footer: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 13,
    paddingBottom: 26,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
