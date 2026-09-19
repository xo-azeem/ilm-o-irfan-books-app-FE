import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { APP_VERSION, isBelowMinimum } from '@/config/appVersion';
import { AdminPickerSheet } from '@/features/admin/components/AdminControls';
import { AdminMenuSkeleton } from '@/features/admin/components/AdminSkeletons';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminActionBar,
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
import {
  useDirtyTracker,
  useUnsavedGuard,
} from '@/features/admin/hooks/useAdminForm';
import { useAppInsets } from '@/hooks/useAppInsets';
import {
  useAdminCollections,
  useAdminSettings,
  useUpdateAdminSettings,
} from '@/hooks/useAdmin';
import { useTheme } from '@/theme/ThemeContext';
import { useStrings } from '@/i18n';

/**
 * App settings.
 *
 * Every switch is written as what a reader will see, not as the column it
 * sets — and every one of them is read by the reader app through
 * `app-status`, on launch and on each return to the foreground, so what it
 * says here is what happens there within a minute. Admins are never held
 * out by any of it: the maintenance notice and the version floor apply to
 * readers only, so the switch can always be reached to turn it off.
 *
 * There is deliberately no PDF-access switch: `get-signed-pdf` grants a
 * file to the admin role or an active entitlement and to nothing else, so
 * there is no flag here that could contradict it.
 */
export function AdminSettingsScreen() {
  const { colors } = useTheme();
  const s = useStrings();
  const words = s.admin.settings;
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

  // Same guard as every editor: the tag in the header, and a back gesture
  // that asks before it throws edits away.
  const { isDirty: dirty, reset, dirtyRef } = useDirtyTracker(form);
  useUnsavedGuard(dirtyRef);

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

  // Snapshot once the row has landed so the guard starts clean.
  useEffect(() => {
    if (data) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // A floor above this very build would hold every reader on it at the door.
  // Admins are exempt, so this is a warning rather than a block — but it is
  // the one mistake here that locks readers out, and it says so.
  const versionTrimmed = form.minVersion.trim();
  const versionLooksValid =
    !versionTrimmed || /^v?\d+(\.\d+)*$/i.test(versionTrimmed);
  const versionAboveThisBuild =
    versionLooksValid && isBelowMinimum(versionTrimmed, APP_VERSION);

  const featured = collections.find(
    item => item.id === form.featuredCollectionId,
  );

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
        onSuccess: () => {
          reset();
          toast.success(words.saved);
        },
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
          title={words.loadFailed}
          message={words.loadFailedMessage}
          detail={error ? errorMessage(error) : undefined}
          onRetry={() => void refetch()}
        />
      </Shell>
    );
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink
          label={s.admin.system.title}
          action={
            dirty ? (
              <AdminTag label={s.admin.ui.unsaved} tone="warning" />
            ) : undefined
          }
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
        showsVerticalScrollIndicator={false}
      >
        <AdminScreenTitle title={words.title} />

        <AdminRowGroup title={words.availability}>
          <View style={styles.settingRow}>
            <AdminToggleRow
              label={words.maintenanceMode}
              description={
                form.maintenanceMode
                  ? words.maintenanceOn
                  : words.maintenanceOff
              }
              value={form.maintenanceMode}
              onValueChange={value =>
                setForm(current => ({ ...current, maintenanceMode: value }))
              }
            />
          </View>
          <View style={styles.settingRow}>
            <AdminToggleRow
              label={words.newSignups}
              description={
                form.signupEnabled ? words.signupsOpen : words.signupsClosed
              }
              value={form.signupEnabled}
              onValueChange={value =>
                setForm(current => ({ ...current, signupEnabled: value }))
              }
            />
          </View>
        </AdminRowGroup>

        <AdminField
          label={words.noticeLabel}
          value={form.maintenanceMessage}
          onChangeText={value =>
            setForm(current => ({ ...current, maintenanceMessage: value }))
          }
          multiline
          maxLength={240}
          placeholder={words.noticePlaceholder}
        />

        <AdminRowGroup title={words.homeScreen}>
          <AdminNavRow
            label={words.featuredShelf}
            value={featured?.title ?? s.admin.ui.none}
            onPress={() => setShowCollectionPicker(true)}
          />
        </AdminRowGroup>

        <View style={styles.block}>
          <AdminEyebrow>{words.supportVersions}</AdminEyebrow>
          <AdminField
            label={words.supportEmail}
            value={form.supportEmail}
            onChangeText={value =>
              setForm(current => ({ ...current, supportEmail: value }))
            }
            placeholder="help@ilmoirfan.pk"
            autoCapitalize="none"
            keyboardType="email-address"
            helper={words.supportEmailHint}
          />
          <AdminField
            label={words.minVersion}
            value={form.minVersion}
            onChangeText={value =>
              setForm(current => ({ ...current, minVersion: value }))
            }
            placeholder="1.2.0"
            autoCapitalize="none"
            mono
            error={!versionLooksValid ? words.minVersionError : null}
            helper={
              versionAboveThisBuild
                ? words.minVersionAbove(APP_VERSION)
                : words.minVersionHint(APP_VERSION)
            }
            helperTone={versionAboveThisBuild ? 'warning' : undefined}
          />
        </View>

        <View
          style={[styles.note, { backgroundColor: colors.primaryFillSoft }]}
        >
          <Text size={11.5} leading={1.5} tone="muted">
            {words.pdfNote}
          </Text>
        </View>

        <Text size={11.5} leading={1.45} tone="faint">
          {words.auditNote}
        </Text>
      </ScrollView>

      <AdminActionBar>
        <AdminButton
          label={words.save}
          loading={update.isPending}
          disabled={!dirty}
          onPress={handleSave}
        />
      </AdminActionBar>

      <AdminPickerSheet
        visible={showCollectionPicker}
        title={words.featuredShelf}
        items={[
          { id: '', label: s.admin.ui.none },
          ...collections.map(collection => ({
            id: collection.id,
            label: collection.title,
            sublabel: words.collectionSublabel(
              collection.kind,
              collection.book_count,
            ),
            accent: collection.accent,
          })),
        ]}
        selected={
          form.featuredCollectionId ? [form.featuredCollectionId] : ['']
        }
        onClose={() => setShowCollectionPicker(false)}
        onChange={next =>
          setForm(current => ({
            ...current,
            featuredCollectionId: next[0] || null,
          }))
        }
      />
    </SafeAreaView>
  );
}

/** The screen frame, reused by the loading and error states. */
function Shell({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const s = useStrings();

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink label={s.admin.system.title} />
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
});
