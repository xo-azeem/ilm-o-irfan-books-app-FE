import { useCallback, useMemo, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import {
  CalendarClock,
  Download,
  Hourglass,
  Share2,
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
import { useSubscription } from '@/hooks/useAccount';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import {
  useCancelMembership,
  useStoreConfirmationWatch,
  useWithdrawCancellation,
} from '@/hooks/useBilling';
import { useAccess } from '@/lib/access';
import { exportMyDataToFile, shareMyData } from '@/services/dataExport';
import {
  DELETION_REASON_MAX_LENGTH,
  DeletionRequestError,
  isBillingBlocker,
  isOpenDeletionRequest,
  isStaleDeletionState,
  isWithdrawableDeletionRequest,
  type DeletionRequest,
  type DeletionStatus,
} from '@/services/accountDeletion';
import { cancellationAvailability, storeName } from '@/services/billing';
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
        month: 'long',
        year: 'numeric',
      });
}

/** An absolute moment, for a deletion the reader needs to be able to plan around. */
function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return `${formatDate(iso)} at ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/**
 * The open request, in the reader's words.
 *
 * The status is the backend's; the sentence is ours. `failed` is deliberately
 * not called that: to the reader it is a deletion still in progress that an
 * admin is looking at, not a fault they can do anything about.
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
        title: 'Your request is with our team',
        message: `Sent on ${formatDate(request.requestedAt)}. An admin will review it and you will be notified by email and in the app. You can withdraw the request at any time until it is approved.`,
        tone: 'info',
        icon: Hourglass,
      };
    case 'approved':
      return {
        title: `Scheduled for ${formatDateTime(request.scheduledFor)}`,
        message:
          'Your account, reading progress, wishlist, downloads and highlights will be removed then. Cancel the deletion before that moment to keep everything.',
        tone: 'danger',
        icon: CalendarClock,
      };
    case 'processing':
    case 'failed':
      return {
        title: 'In progress',
        message:
          'Your account is being deleted. You will be signed out when it completes; nothing more is needed from you.',
        tone: 'danger',
        icon: Trash2,
      };
    case 'completed':
      return {
        title: 'Account deleted',
        message: 'This account no longer exists. You will be signed out.',
        tone: 'danger',
        icon: Trash2,
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
 * account deletion, which both stores require to be reachable in-app. The
 * name matters: the emails the backend sends say "Profile → Privacy &
 * security", so deletion, sessions, data export and membership cancellation
 * all live on this one screen.
 *
 * Deletion is a request, not a button: the backend decides whether it may be
 * filed (an auto-renewing store subscription blocks it, because we cannot
 * cancel the store's billing for the reader), an admin approves it, and it
 * runs after a grace period during which the reader may still cancel. This
 * screen shows whatever state the backend reports and offers the two moves.
 */
export function PrivacySecurityScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { status, request, cancel } = useAccountDeletion();
  const reasonSheet = useSheet();
  const [reason, setReason] = useState('');

  const data = status.data;
  const current = data?.request ?? null;
  const open = isOpenDeletionRequest(current);
  const withdrawable = isWithdrawableDeletionRequest(current);
  const blockers = useMemo(() => data?.blockers ?? [], [data?.blockers]);
  const warnings = data?.warnings ?? [];

  // ── Membership ───────────────────────────────────────────────────────────
  const { data: subscription } = useSubscription();
  const { expiresAt } = useAccess();
  const cancelMembership = useCancelMembership();
  const withdrawCancellation = useWithdrawCancellation();
  const availability = cancellationAvailability({
    active: subscription?.active ?? false,
    status: subscription?.status ?? null,
    store: subscription?.store ?? null,
    cancelRequestedAt: subscription?.cancelRequestedAt ?? null,
  });
  const storeLabel = storeName(subscription?.store);
  useStoreConfirmationWatch(availability === 'pending');

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
   * Records the intent on the backend, then hands the reader to the store —
   * the only place a renewal can actually be stopped. The backend's reminder
   * emails follow from the record; the store's confirmation arrives by
   * webhook and the screen reads it back.
   */
  const handleCancelMembership = useCallback(() => {
    if (availability === 'not_store_managed') {
      showDialog({
        title: 'Managed by us',
        message:
          'This membership is not billed through the App Store or Google Play, so there is nothing to cancel in a store. Write to support and we will sort it out.',
        tone: 'info',
      });
      return;
    }
    const until = expiresAt ? formatDate(expiresAt) : null;
    showDialog({
      title: 'Cancel membership?',
      message: [
        until
          ? `You keep full access until ${until}; after that it will not renew.`
          : 'You keep full access until the end of the period you have paid for; after that it will not renew.',
        `${storeLabel} opens next for you to turn off auto-renew. We will email you once it is done.`,
      ].join('\n\n'),
      icon: CalendarClock,
      actions: [
        { label: 'Keep membership', style: 'cancel' },
        {
          label: 'Continue to cancel',
          style: 'destructive',
          onPress: () =>
            cancelMembership.mutate(undefined, {
              onSuccess: outcome => {
                if (outcome.status === 'already_cancelled') {
                  showDialog({
                    title: 'Already cancelled',
                    message: until
                      ? `Your membership is already set to end on ${until}.`
                      : 'Your membership is already set to end.',
                    tone: 'info',
                    icon: CalendarClock,
                  });
                  return;
                }
                if (outcome.opened.status === 'unavailable') {
                  showDialog({
                    title: `Finish in ${storeLabel}`,
                    message:
                      'Your request is noted. To stop the renewal, turn off auto-renew in your subscriptions.',
                    tone: 'info',
                    icon: Store,
                    actions: [
                      { label: 'Later', style: 'cancel' },
                      {
                        label: 'Open subscriptions',
                        onPress: () => openUrl(MANAGE_SUBSCRIPTIONS_URL),
                      },
                    ],
                  });
                }
              },
              onError: error =>
                showError('Could not start the cancellation', error),
            }),
        },
      ],
    });
  }, [
    availability,
    cancelMembership,
    expiresAt,
    openUrl,
    showError,
    storeLabel,
  ]);

  const handleKeepMembership = useCallback(() => {
    withdrawCancellation.mutate(undefined, {
      onSuccess: () =>
        showDialog({
          title: 'Membership kept',
          message:
            'Your cancellation request has been withdrawn. If you already turned off auto-renew in the store, turn it back on there.',
          tone: 'success',
        }),
      onError: error => showError('Could not withdraw', error),
    });
  }, [showError, withdrawCancellation]);

  // ── Data export ──────────────────────────────────────────────────────────
  /**
   * Download my data: the backend builds the document, the phone hands it
   * over — to a place the reader chooses, or to the share sheet. Nothing is
   * emailed and nothing waits.
   */
  const handleExport = useCallback(() => {
    showDialog({
      title: 'Download my data',
      message:
        'We will prepare a JSON file with your account, profile, membership, reading record, highlights, wishlist and downloads. Save it to your phone, or share it to Drive, Mail or another app.',
      tone: 'info',
      icon: Download,
      actions: [
        { label: 'Cancel', style: 'cancel' },
        {
          label: 'Share',
          onPress: () =>
            void shareMyData().then(
              () => undefined,
              error => showError('Could not prepare your data', error),
            ),
        },
        {
          label: 'Save as file',
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
        case 'change-email':
          navigation.navigate('ChangeEmail');
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

  // ── Deletion ─────────────────────────────────────────────────────────────
  const reasonTooLong = reason.length > DELETION_REASON_MAX_LENGTH;

  /**
   * The moment of truth. Warnings are shown once more inside the sheet, so a
   * reader confirming here has read that their paid-through month is lost.
   * A refusal is explained in the backend's own sentence — never its token.
   */
  const submitRequest = useCallback(() => {
    if (reasonTooLong) {
      return;
    }
    request.mutate(reason, {
      onSuccess: (next: DeletionStatus) => {
        reasonSheet.close();
        setReason('');
        showDialog({
          title: 'Request received',
          message: `Our team will review it and let you know. If approved, the deletion is scheduled ${next.graceDays} days later, and you can cancel it from this screen at any time until then.`,
          tone: 'info',
          icon: Hourglass,
        });
      },
      onError: error => {
        reasonSheet.close();
        if (isStaleDeletionState(error)) {
          // A request already exists: the screen now shows it. Nothing to say.
          return;
        }
        if (isBillingBlocker(error)) {
          showDialog({
            title: 'Cancel your membership first',
            message: (error as DeletionRequestError).message,
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
        if (
          error instanceof DeletionRequestError &&
          error.code === 'ADMIN_ACCOUNT'
        ) {
          showDialog({
            title: 'Account cannot be deleted',
            message: error.message,
            tone: 'warning',
            icon: ShieldCheck,
          });
          return;
        }
        if (
          error instanceof DeletionRequestError &&
          error.code === 'REASON_TOO_LONG'
        ) {
          reasonSheet.open();
          return;
        }
        showError('Could not send the request', error);
      },
    });
  }, [openUrl, reason, reasonSheet, reasonTooLong, request, showError]);

  const handleDelete = useCallback(() => {
    if (!data) {
      return;
    }

    // A deployment that pre-checks has already said no; say why, and where
    // to fix it. Otherwise the RPC itself answers, in `submitRequest`.
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
    const approved = current?.status === 'approved';
    showDialog({
      title: approved ? 'Cancel the deletion?' : 'Withdraw the request?',
      message: approved
        ? 'The scheduled deletion will be cancelled and your account kept as it is.'
        : 'The request will be withdrawn and nothing will be removed.',
      actions: [
        { label: 'Go back', style: 'cancel' },
        {
          label: 'Keep my account',
          onPress: () =>
            cancel.mutate(undefined, {
              onError: error => {
                if (isStaleDeletionState(error)) {
                  return;
                }
                showError('Could not withdraw the request', error);
              },
            }),
        },
      ],
    });
  }, [cancel, current?.status, showError]);

  const requestCard = useMemo(() => {
    if (!current) {
      return null;
    }

    if (open || current.status === 'completed') {
      const copy = describeRequest(current);
      return (
        <Callout
          title={copy.title}
          message={copy.message}
          tone={copy.tone}
          icon={copy.icon}
          action={
            withdrawable ? (
              <Button
                label={
                  cancel.isPending
                    ? 'Withdrawing…'
                    : current.status === 'approved'
                      ? 'Cancel deletion'
                      : 'Withdraw request'
                }
                size="sm"
                variant="secondary"
                onPress={handleWithdraw}
                loading={cancel.isPending}
              />
            ) : undefined
          }
        />
      );
    }

    if (current.status === 'rejected') {
      return (
        <Callout
          title="Your last request was declined"
          message={
            current.decisionNote
              ? `On ${formatDate(current.decidedAt)}: ${current.decisionNote}`
              : `Declined on ${formatDate(current.decidedAt)}. You can request again below.`
          }
          tone="info"
          icon={XCircle}
        />
      );
    }

    return null;
  }, [cancel.isPending, current, handleWithdraw, open, withdrawable]);

  const membershipRow = useMemo(() => {
    switch (availability) {
      case 'cancellable':
      case 'not_store_managed':
        return (
          <SettingsRow
            title="Cancel membership"
            subtitle={
              availability === 'cancellable'
                ? `Billed by ${storeLabel} · auto-renews${
                    expiresAt ? ` on ${formatDate(expiresAt)}` : ''
                  }`
                : 'Not billed through a store'
            }
            danger
            onPress={handleCancelMembership}
          />
        );
      case 'pending':
        return (
          <SettingsRow
            title="Cancellation requested"
            subtitle={`Finish in ${storeLabel}, or keep your membership`}
            trailing={
              <Button
                label={withdrawCancellation.isPending ? 'Keeping…' : 'Keep'}
                size="sm"
                variant="secondary"
                onPress={handleKeepMembership}
                loading={withdrawCancellation.isPending}
              />
            }
          />
        );
      case 'ending':
        return (
          <SettingsRow
            title="Membership ending"
            subtitle={
              expiresAt
                ? `Access until ${formatDate(expiresAt)} · resume in ${storeLabel}`
                : `Resume in ${storeLabel} to keep it`
            }
            onPress={() => openUrl(MANAGE_SUBSCRIPTIONS_URL)}
          />
        );
      default:
        return (
          <SettingsRow
            title="Membership"
            subtitle={
              subscription?.canAccessPremium
                ? 'Active — see plan and billing'
                : 'No active membership'
            }
            onPress={() => navigation.navigate('Subscription')}
          />
        );
    }
  }, [
    availability,
    expiresAt,
    handleCancelMembership,
    handleKeepMembership,
    navigation,
    openUrl,
    storeLabel,
    subscription?.canAccessPremium,
    withdrawCancellation.isPending,
  ]);

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
            icon={row.id === 'export' ? Share2 : undefined}
            onPress={() => handleSecurityRow(row.id)}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup title="Membership">
        {membershipRow}
        <SettingsRow
          title="Manage in the store"
          subtitle={`Plans, receipts and auto-renew live in ${storeLabel}`}
          onPress={() => openUrl(MANAGE_SUBSCRIPTIONS_URL)}
        />
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

        {!open && current?.status !== 'completed' && blockers.length > 0 ? (
          <Callout
            title={
              blockers[0].code === 'ADMIN_ACCOUNT'
                ? 'Account cannot be deleted'
                : 'Cancel your membership first'
            }
            message={blockers[0].message}
            tone="warning"
            icon={blockers[0].code === 'ADMIN_ACCOUNT' ? ShieldCheck : Store}
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

        {!open && current?.status !== 'completed' ? (
          <>
            <Text size={fontSize.bodySmall} tone="muted">
              Deleting your account removes your profile, reading progress,
              wishlist, downloads and highlights. Billing records held by the
              App Store, Google Play or RevenueCat may be retained as required
              by law. Our team reviews every request; an approved one is
              scheduled {data?.graceDays ?? 7} days later, and you can cancel it
              until then.
            </Text>
            <Button
              label={
                current?.status === 'rejected'
                  ? 'Request again'
                  : 'Request deletion'
              }
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
            label={request.isPending ? 'Sending…' : 'Request deletion'}
            variant="dangerSolid"
            onPress={submitRequest}
            loading={request.isPending}
            disabled={reasonTooLong}
            fullWidth
          />
        }
      >
        <View style={styles.sheetBody}>
          <Card tone="alt" padded>
            <Text size={fontSize.bodySmall} weight="600">
              What deletion does
            </Text>
            <Text size={fontSize.bodySmall} tone="soft" style={styles.warning}>
              • Your profile, reading progress, wishlist, downloads and
              highlights are removed and cannot be recovered.
            </Text>
            <Text size={fontSize.bodySmall} tone="soft" style={styles.warning}>
              • Store and RevenueCat billing records may be retained as required
              by law.
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

          <Text size={fontSize.bodySmall} tone="muted">
            Tell us why, if you like. It helps us improve, and it is read by the
            admin who reviews your request.
          </Text>

          <TextField
            label="Reason (optional)"
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. I no longer use the app"
            multiline
            height={110}
            textAlignVertical="top"
            maxLength={DELETION_REASON_MAX_LENGTH + 50}
            error={
              reasonTooLong
                ? `Keep the reason under ${DELETION_REASON_MAX_LENGTH} characters (${reason.length} now).`
                : undefined
            }
            hint={`${reason.length}/${DELETION_REASON_MAX_LENGTH}`}
          />

          <Text size={fontSize.caption} tone="muted">
            Sending a request does not delete anything yet. Our team will let
            you know the decision, and you can cancel from Profile → Privacy &
            security at any time before the deletion runs.
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
