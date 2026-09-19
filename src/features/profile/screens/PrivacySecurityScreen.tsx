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
  type AccountSecurityRowId,
} from '@/features/profile/data/profileContent';
import type { ProfileStackParamList } from '@/features/profile/navigation/types';
import { useSubscription } from '@/hooks/useAccount';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import {
  useCancelMembership,
  useStoreConfirmationWatch,
  useWithdrawCancellation,
} from '@/hooks/useBilling';
import { useDateLocale, useStrings, type Strings } from '@/i18n';
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

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
}

/** An absolute moment, for a deletion the reader needs to be able to plan around. */
function formatDateTime(
  iso: string | null | undefined,
  locale: string,
  at: string,
): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return `${formatDate(iso, locale)} ${at} ${date.toLocaleTimeString(locale, {
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
function describeRequest(
  request: DeletionRequest,
  s: Strings,
  locale: string,
): {
  title: string;
  message: string;
  tone: 'info' | 'warning' | 'danger';
  icon: typeof Hourglass;
} {
  const words = s.account.privacy.request;
  switch (request.status) {
    case 'pending':
      return {
        title: words.pendingTitle,
        message: words.pendingMessage(formatDate(request.requestedAt, locale)),
        tone: 'info',
        icon: Hourglass,
      };
    case 'approved':
      return {
        title: words.scheduledTitle(
          formatDateTime(request.scheduledFor, locale, s.account.privacy.at),
        ),
        message: words.scheduledMessage,
        tone: 'danger',
        icon: CalendarClock,
      };
    case 'processing':
    case 'failed':
      return {
        title: words.inProgress,
        message: words.inProgressMessage,
        tone: 'danger',
        icon: Trash2,
      };
    case 'completed':
      return {
        title: words.deleted,
        message: words.deletedMessage,
        tone: 'danger',
        icon: Trash2,
      };
    default:
      return {
        title: words.fallback,
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
  const s = useStrings();
  const locale = useDateLocale();
  const words = s.account.privacy;
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

  const openUrl = useCallback(
    (url: string) => {
      void Linking.openURL(url).catch(() =>
        showDialog({
          title: words.link.couldNotOpen,
          message: words.link.tryBrowser,
          tone: 'warning',
        }),
      );
    },
    [words],
  );

  const showError = useCallback(
    (title: string, error: unknown) => {
      showDialog({
        title,
        message: error instanceof Error ? error.message : words.tryShortly,
        tone: 'danger',
      });
    },
    [words],
  );

  /**
   * Records the intent on the backend, then hands the reader to the store —
   * the only place a renewal can actually be stopped. The backend's reminder
   * emails follow from the record; the store's confirmation arrives by
   * webhook and the screen reads it back.
   */
  const handleCancelMembership = useCallback(() => {
    const cm = words.cancelMembership;
    if (availability === 'not_store_managed') {
      showDialog({
        title: cm.managedByUs,
        message: cm.managedByUsMessage,
        tone: 'info',
      });
      return;
    }
    const until = expiresAt ? formatDate(expiresAt, locale) : null;
    showDialog({
      title: cm.title,
      message: [
        until ? cm.keepUntil(until) : cm.keepUntilPeriod,
        cm.storeOpensNext(storeLabel),
      ].join('\n\n'),
      icon: CalendarClock,
      actions: [
        { label: cm.keepMembership, style: 'cancel' },
        {
          label: cm.continueToCancel,
          style: 'destructive',
          onPress: () =>
            cancelMembership.mutate(undefined, {
              onSuccess: outcome => {
                if (outcome.status === 'already_cancelled') {
                  showDialog({
                    title: cm.alreadyCancelled,
                    message: until ? cm.alreadyEndsOn(until) : cm.alreadyEnds,
                    tone: 'info',
                    icon: CalendarClock,
                  });
                  return;
                }
                if (outcome.opened.status === 'unavailable') {
                  showDialog({
                    title: cm.finishIn(storeLabel),
                    message: cm.finishMessage,
                    tone: 'info',
                    icon: Store,
                    actions: [
                      { label: cm.later, style: 'cancel' },
                      {
                        label: cm.openSubscriptions,
                        onPress: () => openUrl(MANAGE_SUBSCRIPTIONS_URL),
                      },
                    ],
                  });
                }
              },
              onError: error => showError(cm.couldNotStart, error),
            }),
        },
      ],
    });
  }, [
    availability,
    cancelMembership,
    expiresAt,
    locale,
    openUrl,
    showError,
    storeLabel,
    words,
  ]);

  const handleKeepMembership = useCallback(() => {
    withdrawCancellation.mutate(undefined, {
      onSuccess: () =>
        showDialog({
          title: words.cancelMembership.kept,
          message: words.cancelMembership.keptMessage,
          tone: 'success',
        }),
      onError: error =>
        showError(words.cancelMembership.couldNotWithdraw, error),
    });
  }, [showError, withdrawCancellation, words]);

  // ── Data export ──────────────────────────────────────────────────────────
  /**
   * Download my data: the backend builds the document, the phone hands it
   * over — to a place the reader chooses, or to the share sheet. Nothing is
   * emailed and nothing waits.
   */
  const handleExport = useCallback(() => {
    const ex = words.export;
    showDialog({
      title: ex.title,
      message: ex.message,
      tone: 'info',
      icon: Download,
      actions: [
        { label: s.common.cancel, style: 'cancel' },
        {
          label: ex.share,
          onPress: () =>
            void shareMyData().then(
              () => undefined,
              error => showError(ex.couldNotPrepare, error),
            ),
        },
        {
          label: ex.saveAsFile,
          onPress: () =>
            void exportMyDataToFile().then(
              result => {
                if (result.saved) {
                  showDialog({
                    title: ex.saved,
                    message: ex.savedMessage,
                    tone: 'success',
                    icon: Download,
                  });
                }
              },
              error => showError(ex.couldNotPrepare, error),
            ),
        },
      ],
    });
  }, [s, showError, words]);

  const handleSecurityRow = useCallback(
    (id: AccountSecurityRowId) => {
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
          title: words.request.received,
          message: words.request.receivedMessage(next.graceDays),
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
            title: words.request.cancelMembershipFirst,
            message: (error as DeletionRequestError).message,
            tone: 'warning',
            icon: Store,
            actions: [
              { label: words.request.notNow, style: 'cancel' },
              {
                label: words.request.manageSubscription,
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
            title: words.request.cannotDelete,
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
        showError(words.request.couldNotSend, error);
      },
    });
  }, [openUrl, reason, reasonSheet, reasonTooLong, request, showError, words]);

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
          ? words.request.cancelMembershipFirst
          : words.request.cannotDelete,
        message: first.message,
        tone: 'warning',
        icon: isBilling ? Store : ShieldCheck,
        actions: isBilling
          ? [
              { label: words.request.notNow, style: 'cancel' },
              {
                label: words.request.manageSubscription,
                onPress: () => openUrl(MANAGE_SUBSCRIPTIONS_URL),
              },
            ]
          : undefined,
      });
      return;
    }

    reasonSheet.open();
  }, [blockers, data, openUrl, reasonSheet, words]);

  const handleWithdraw = useCallback(() => {
    const approved = current?.status === 'approved';
    showDialog({
      title: approved
        ? words.request.cancelDeletionTitle
        : words.request.withdrawTitle,
      message: approved
        ? words.request.cancelDeletionMessage
        : words.request.withdrawMessage,
      actions: [
        { label: words.request.goBack, style: 'cancel' },
        {
          label: words.request.keepAccount,
          onPress: () =>
            cancel.mutate(undefined, {
              onError: error => {
                if (isStaleDeletionState(error)) {
                  return;
                }
                showError(words.request.couldNotWithdraw, error);
              },
            }),
        },
      ],
    });
  }, [cancel, current?.status, showError, words]);

  const requestCard = useMemo(() => {
    if (!current) {
      return null;
    }

    if (open || current.status === 'completed') {
      const copy = describeRequest(current, s, locale);
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
                    ? words.request.withdrawing
                    : current.status === 'approved'
                      ? words.request.cancelDeletion
                      : words.request.withdrawRequest
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
          title={words.request.declinedTitle}
          message={
            current.decisionNote
              ? words.request.declinedOn(
                  formatDate(current.decidedAt, locale),
                  current.decisionNote,
                )
              : words.request.declinedAgain(
                  formatDate(current.decidedAt, locale),
                )
          }
          tone="info"
          icon={XCircle}
        />
      );
    }

    return null;
  }, [
    cancel.isPending,
    current,
    handleWithdraw,
    locale,
    open,
    s,
    withdrawable,
    words,
  ]);

  const membershipRow = useMemo(() => {
    const cm = words.cancelMembership;
    switch (availability) {
      case 'cancellable':
      case 'not_store_managed':
        return (
          <SettingsRow
            title={cm.rowCancel}
            subtitle={
              availability === 'cancellable'
                ? cm.billedBy(
                    storeLabel,
                    expiresAt ? formatDate(expiresAt, locale) : null,
                  )
                : cm.notBilledByStore
            }
            danger
            onPress={handleCancelMembership}
          />
        );
      case 'pending':
        return (
          <SettingsRow
            title={cm.requested}
            subtitle={cm.requestedHint(storeLabel)}
            trailing={
              <Button
                label={withdrawCancellation.isPending ? cm.keeping : cm.keep}
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
            title={cm.ending}
            subtitle={
              expiresAt
                ? cm.endingHint(formatDate(expiresAt, locale), storeLabel)
                : cm.resumeIn(storeLabel)
            }
            onPress={() => openUrl(MANAGE_SUBSCRIPTIONS_URL)}
          />
        );
      default:
        return (
          <SettingsRow
            title={cm.membership}
            subtitle={
              subscription?.canAccessPremium ? cm.activeHint : cm.noActive
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
    locale,
    navigation,
    openUrl,
    storeLabel,
    subscription?.canAccessPremium,
    withdrawCancellation.isPending,
    words,
  ]);

  return (
    <ProfileSubScreenLayout title={words.title} subtitle={words.subtitle}>
      <SettingsGroup title={words.accountSecurity}>
        {accountSecurityRows.map(row => (
          <SettingsRow
            key={row}
            title={words.rows[row]}
            icon={row === 'export' ? Share2 : undefined}
            onPress={() => handleSecurityRow(row)}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup title={words.membership}>
        {membershipRow}
        <SettingsRow
          title={words.manageInStore}
          subtitle={words.manageInStoreHint(storeLabel)}
          onPress={() => openUrl(MANAGE_SUBSCRIPTIONS_URL)}
        />
      </SettingsGroup>

      <SettingsGroup title={words.legal}>
        {legalRows.map(row => (
          <SettingsRow
            key={row}
            title={words.legalRows[row]}
            onPress={() =>
              openUrl(row === 'terms' ? TERMS_URL : PRIVACY_POLICY_URL)
            }
          />
        ))}
      </SettingsGroup>

      <View style={styles.deletion}>
        <Text size={fontSize.caption} weight="600" tone="muted">
          {words.deleteAccount}
        </Text>

        {requestCard}

        {!open && current?.status !== 'completed' && blockers.length > 0 ? (
          <Callout
            title={
              blockers[0].code === 'ADMIN_ACCOUNT'
                ? words.request.cannotDelete
                : words.request.cancelMembershipFirst
            }
            message={blockers[0].message}
            tone="warning"
            icon={blockers[0].code === 'ADMIN_ACCOUNT' ? ShieldCheck : Store}
            action={
              blockers[0].code !== 'ADMIN_ACCOUNT' ? (
                <Button
                  label={words.request.manageSubscription}
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
              {words.request.explainer(data?.graceDays ?? 7)}
            </Text>
            <Button
              label={
                current?.status === 'rejected'
                  ? words.request.requestAgain
                  : words.request.requestDeletion
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
        title={words.request.sheetTitle}
        scrollable
        footer={
          <Button
            label={
              request.isPending
                ? words.request.sending
                : words.request.requestDeletion
            }
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
              {words.request.whatItDoes}
            </Text>
            <Text size={fontSize.bodySmall} tone="soft" style={styles.warning}>
              {words.request.bullet1}
            </Text>
            <Text size={fontSize.bodySmall} tone="soft" style={styles.warning}>
              {words.request.bullet2}
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
            {words.request.tellUsWhy}
          </Text>

          <TextField
            label={words.request.reasonLabel}
            value={reason}
            onChangeText={setReason}
            placeholder={words.request.reasonPlaceholder}
            multiline
            height={110}
            textAlignVertical="top"
            maxLength={DELETION_REASON_MAX_LENGTH + 50}
            error={
              reasonTooLong
                ? words.request.reasonTooLong(
                    DELETION_REASON_MAX_LENGTH,
                    reason.length,
                  )
                : undefined
            }
            hint={`${reason.length}/${DELETION_REASON_MAX_LENGTH}`}
          />

          <Text size={fontSize.caption} tone="muted">
            {words.request.footer}
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
