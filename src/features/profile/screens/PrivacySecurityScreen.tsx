import { useCallback, useMemo, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import {
  CalendarClock,
  Download,
  Hourglass,
  ShieldCheck,
  Store,
  Trash2,
  XCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  Button,
  Callout,
  Card,
  SettingsGroup,
  SettingsRow,
  Sheet,
  showDialog,
  Text,
  TextField,
  useSheet,
} from '@/components/ui';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import {
  accountSecurityRows,
  legalRows,
} from '@/features/profile/data/profileContent';
import type { ProfileStackParamList } from '@/features/profile/navigation/types';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import { exportMyDataToFile } from '@/services/dataExport';
import {
  DeletionRequestError,
  isOpenDeletionRequest,
  type DeletionRequest,
  type DeletionStatus,
} from '@/services/accountDeletion';
import { fontSize } from '@/theme/typography';

const PRIVACY_POLICY_URL = 'https://ilmoirfan.com/privacy';
const TERMS_URL = 'https://ilmoirfan.com/terms';

/** Where the store keeps the reader's subscriptions — the only place to cancel. */
const MANAGE_SUBSCRIPTIONS_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';

function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

/**
 * The open request, in the reader's words.
 *
 * The status is the backend's; the sentence is ours. `failed` is deliberately
 * not called that: to the reader it is a request on hold for a reason they
 * can act on (the blocker the executor hit), not a fault.
 */
function describeRequest(request: DeletionRequest): {
  title: string;
  message: string;
  tone: 'info' | 'warning' | 'danger';
  icon: typeof Hourglass;
} {
  switch (request.status) {
    case 'pending':
      return {
        title: 'Deletion requested',
        message: `Sent on ${formatDate(request.requestedAt)}. An admin will review it and you will be notified. You can withdraw the request at any time before then.`,
        tone: 'info',
        icon: Hourglass,
      };
    case 'approved':
      return {
        title: 'Deletion approved',
        message: `Your account and everything in it will be deleted on ${formatDate(request.scheduledFor)}. Withdraw the request before then to keep it.`,
        tone: 'danger',
        icon: CalendarClock,
      };
    case 'processing':
      return {
        title: 'Deleting your account',
        message:
          'This is happening now. You will be signed out when it completes.',
        tone: 'danger',
        icon: Trash2,
      };
    case 'failed':
      return {
        title: 'Deletion on hold',
        message:
          request.lastError?.replace(/^[A-Z_]+:\s*/, '') ??
          'Something stopped the deletion from running. An admin will look at it; you can still withdraw the request.',
        tone: 'warning',
        icon: Hourglass,
      };
    default:
      return {
        title: 'Deletion request',
        message: '',
        tone: 'info',
        icon: Hourglass,
      };
  }
}

/**
 * Privacy & security.
 *
 * The account and legal rows a store review expects to find here — including
 * account deletion, which both stores require to be reachable in-app.
 *
 * Deletion is a request, not a button: the backend decides whether it may be
 * filed (an auto-renewing store subscription blocks it, because we cannot
 * cancel the store's billing for the reader), an admin approves it, and it
 * runs after a grace period during which the reader may still withdraw. This
 * screen shows whatever state the backend reports and offers the two moves.
 */
export function PrivacySecurityScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { status, request, cancel } = useAccountDeletion();
  const reasonSheet = useSheet();
  const [reason, setReason] = useState('');

  const data = status.data;
  const open = isOpenDeletionRequest(data?.request);
  const blockers = useMemo(() => data?.blockers ?? [], [data?.blockers]);
  const warnings = data?.warnings ?? [];

  const openUrl = useCallback((url: string) => {
    void Linking.openURL(url).catch(() =>
      showDialog({
        title: 'Could not open link',
        message: 'Please try again from a browser.',
        tone: 'warning',
      }),
    );
  }, []);

  const showError = useCallback((title: string, error: unknown) => {
    showDialog({
      title,
      message:
        error instanceof Error ? error.message : 'Please try again shortly.',
      tone: 'danger',
    });
  }, []);

  /**
   * Download my data: the backend builds the document, the phone saves it
   * where the reader chooses. Nothing is emailed and nothing waits — the copy
   * is in their hands before the dialog closes.
   */
  const handleExport = useCallback(() => {
    showDialog({
      title: 'Download my data',
      message:
        'We will prepare a JSON file with your account, profile, membership, reading record, highlights, wishlist and downloads, and let you choose where to save it.',
      tone: 'info',
      icon: Download,
      actions: [
        { label: 'Cancel', style: 'cancel' },
        {
          label: 'Prepare file',
          onPress: () =>
            void exportMyDataToFile().then(
              result => {
                if (result.saved) {
                  showDialog({
                    title: 'Saved',
                    message: 'Your data is in the file you chose.',
                    tone: 'success',
                    icon: Download,
                  });
                }
              },
              error => showError('Could not prepare your data', error),
            ),
        },
      ],
    });
  }, [showError]);

  const handleSecurityRow = useCallback(
    (id: string) => {
      switch (id) {
        case 'sign-in-methods':
          navigation.navigate('SignInMethods');
          break;
        case 'change-password':
          navigation.navigate('ChangePassword');
          break;
        case 'devices':
          navigation.navigate('Devices');
          break;
        case 'export':
          handleExport();
          break;
      }
    },
    [handleExport, navigation],
  );

  /**
   * The moment of truth. Warnings are shown once more inside the sheet, so a
   * reader confirming here has read that their paid-through month is lost.
   */
  const submitRequest = useCallback(() => {
    request.mutate(reason, {
      onSuccess: (next: DeletionStatus) => {
        reasonSheet.close();
        setReason('');
        showDialog({
          title: 'Request received',
          message: `An admin will review it. If approved, your account is deleted ${next.graceDays} days later, and you can withdraw the request at any time until then.`,
          tone: 'info',
          icon: Hourglass,
        });
      },
      onError: error => {
        reasonSheet.close();
        if (
          error instanceof DeletionRequestError &&
          (error.code === 'SUBSCRIPTION_ACTIVE' ||
            error.code === 'BILLING_UNRESOLVED')
        ) {
          showDialog({
            title: 'Cancel your membership first',
            message: error.message,
            tone: 'warning',
            icon: Store,
            actions: [
              { label: 'Not now', style: 'cancel' },
              {
                label: 'Manage subscription',
                onPress: () => openUrl(MANAGE_SUBSCRIPTIONS_URL),
              },
            ],
          });
          return;
        }
        showError('Could not send the request', error);
      },
    });
  }, [openUrl, reason, reasonSheet, request, showError]);

  const handleDelete = useCallback(() => {
    if (!data) {
      return;
    }

    // The backend has already said no; say why, and where to fix it.
    if (blockers.length > 0) {
      const first = blockers[0];
      const isBilling =
        first.code === 'SUBSCRIPTION_ACTIVE' ||
        first.code === 'BILLING_UNRESOLVED';
      showDialog({
        title: isBilling
          ? 'Cancel your membership first'
          : 'Account cannot be deleted',
        message: first.message,
        tone: 'warning',
        icon: isBilling ? Store : ShieldCheck,
        actions: isBilling
          ? [
              { label: 'Not now', style: 'cancel' },
              {
                label: 'Manage subscription',
                onPress: () => openUrl(MANAGE_SUBSCRIPTIONS_URL),
              },
            ]
          : undefined,
      });
      return;
    }

    reasonSheet.open();
  }, [blockers, data, openUrl, reasonSheet]);

  const handleWithdraw = useCallback(() => {
    showDialog({
      title: 'Keep your account?',
      message:
        'The deletion request will be withdrawn and nothing will be removed.',
      actions: [
        { label: 'Go back', style: 'cancel' },
        {
          label: 'Keep my account',
          onPress: () =>
            cancel.mutate(undefined, {
              onError: error =>
                showError('Could not withdraw the request', error),
            }),
        },
      ],
    });
  }, [cancel, showError]);

  const requestCard = useMemo(() => {
    if (!data?.request) {
      return null;
    }
    const current = data.request;

    if (open) {
      const copy = describeRequest(current);
      return (
        <Callout
          title={copy.title}
          message={copy.message}
          tone={copy.tone}
          icon={copy.icon}
          action={
            current.status === 'processing' ? undefined : (
              <Button
                label={cancel.isPending ? 'Withdrawing…' : 'Keep my account'}
                size="sm"
                variant="secondary"
                onPress={handleWithdraw}
                loading={cancel.isPending}
              />
            )
          }
        />
      );
    }

    if (current.status === 'rejected') {
      return (
        <Callout
          title="Last request declined"
          message={
            current.decisionNote
              ? `On ${formatDate(current.decidedAt)}: ${current.decisionNote}`
              : `Declined on ${formatDate(current.decidedAt)}. You can send a new request below.`
          }
          tone="info"
          icon={XCircle}
        />
      );
    }

    return null;
  }, [cancel.isPending, data?.request, handleWithdraw, open]);

  return (
    <ProfileSubScreenLayout
      title="Privacy & security"
      subtitle="You decide what leaves this device."
    >
      <SettingsGroup title="Account security">
        {accountSecurityRows.map(row => (
          <SettingsRow
            key={row.id}
            title={row.label}
            onPress={() => handleSecurityRow(row.id)}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup title="Legal">
        {legalRows.map(row => (
          <SettingsRow
            key={row.id}
            title={row.label}
            onPress={() =>
              openUrl(row.id === 'terms' ? TERMS_URL : PRIVACY_POLICY_URL)
            }
          />
        ))}
      </SettingsGroup>

      <View style={styles.deletion}>
        <Text size={fontSize.caption} weight="600" tone="muted">
          DELETE ACCOUNT
        </Text>

        {requestCard}

        {!open && blockers.length > 0 ? (
          <Callout
            title="Cancel your membership first"
            message={blockers[0].message}
            tone="warning"
            icon={Store}
            action={
              blockers[0].code !== 'ADMIN_ACCOUNT' ? (
                <Button
                  label="Manage subscription"
                  size="sm"
                  variant="secondary"
                  onPress={() => openUrl(MANAGE_SUBSCRIPTIONS_URL)}
                />
              ) : undefined
            }
          />
        ) : null}

        {!open ? (
          <>
            <Text size={fontSize.bodySmall} tone="muted">
              Deleting removes your profile, membership record, library,
              downloads and reading history. An admin reviews every request; an
              approved one runs after {data?.graceDays ?? 7} days, and you can
              withdraw it until then.
            </Text>
            <Button
              label="Request account deletion"
              variant="danger"
              size="md"
              onPress={handleDelete}
              disabled={status.isPending || !data}
            />
          </>
        ) : null}
      </View>

      <Sheet
        visible={reasonSheet.visible}
        onClose={reasonSheet.close}
        title="Request account deletion"
        scrollable
        footer={
          <Button
            label={request.isPending ? 'Sending…' : 'Send request'}
            variant="dangerSolid"
            onPress={submitRequest}
            loading={request.isPending}
            fullWidth
          />
        }
      >
        <View style={styles.sheetBody}>
          {warnings.length > 0 ? (
            <Card tone="alt" padded>
              <Text size={fontSize.bodySmall} weight="600">
                Before you send this
              </Text>
              {warnings.map(warning => (
                <Text
                  key={warning.code}
                  size={fontSize.bodySmall}
                  tone="soft"
                  style={styles.warning}
                >
                  • {warning.message}
                </Text>
              ))}
            </Card>
          ) : null}

          <Text size={fontSize.bodySmall} tone="muted">
            Tell us why, if you like. It helps us improve, and it is read by the
            admin who reviews your request.
          </Text>

          <TextField
            label="Reason (optional)"
            value={reason}
            onChangeText={value => setReason(value.slice(0, 1000))}
            placeholder="e.g. I no longer use the app"
            multiline
            height={110}
            textAlignVertical="top"
          />

          <Text size={fontSize.caption} tone="muted">
            Sending a request does not delete anything yet. You will be notified
            of the decision, and can withdraw the request from this screen at
            any time before the deletion runs.
          </Text>
        </View>
      </Sheet>
    </ProfileSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  deletion: {
    gap: 12,
    marginTop: 8,
  },
  sheetBody: {
    gap: 14,
  },
  warning: {
    marginTop: 6,
  },
});
