import { memo, useCallback, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, Wrench } from 'lucide-react-native';

import { AppLogo } from '@/components/brand';
import {
  EmptyState,
  IconTile,
  showDialog,
  Text,
  TextButton,
} from '@/components/ui';
import { APP_VERSION } from '@/config/appVersion';
import { supportContact } from '@/features/profile/data/profileContent';
import {
  refetchAppStatus,
  useAppStatus,
  useAppStatusPolling,
} from '@/hooks/useAppStatus';
import { useDateLocale, useStrings } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Where "Update" sends a reader. The store pages open in the store app when
 * it is installed and in the browser when it is not, so neither needs the
 * `market://` / `itms-apps://` schemes and their failure modes.
 *
 * The App Store id is assigned when the app is first submitted; until it is
 * filled in, iOS readers are told what to search for instead of being sent
 * to a page that does not exist.
 */
const ANDROID_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.ilmoirfanapp';
const IOS_APP_STORE_ID: string | null = null;
const IOS_STORE_URL = IOS_APP_STORE_ID
  ? `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`
  : null;

/**
 * The two notices that can stand between an install and the app.
 *
 * Both keep the app's own shape — logo, a sentence about what happened, a
 * sentence confirming nothing was lost, one useful action — so a reader
 * held at the door still recognises where they are. The support address is
 * the one an admin set, falling back to the bundled one.
 */
export const AppGateScreen = memo(function AppGateScreen({
  gate,
  onAdminSignIn,
}: {
  gate: 'maintenance' | 'update';
  /**
   * Lifts the gate just far enough to reach the sign-in screens. The
   * switches that put this notice up live in the admin tool, and an admin
   * who is signed out has to be able to get back to them.
   */
  onAdminSignIn: () => void;
}) {
  const { colors } = useTheme();
  const s = useStrings();
  const words = s.status;
  const locale = useDateLocale();
  const client = useQueryClient();
  const status = useAppStatus();
  // While this screen is up the flags are re-read every few seconds, so the
  // notice lifts on its own once the admin turns it off. This screen
  // unmounting the moment that happens is what makes the poll stop.
  useAppStatusPolling();
  const [checking, setChecking] = useState(false);
  // "Try again" that comes back still closed needs to say it looked, or the
  // tap feels ignored.
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const supportEmail = status.supportEmail || supportContact.email;

  // A reader's session on this phone would be signed out to make room for
  // the admin's. On a shared device that is somebody else's account, so it
  // is asked, not assumed.
  const signedInEmail = useAuthStore(state =>
    state.isAuthenticated ? state.email : null,
  );
  const adminSignIn = useCallback(() => {
    if (!signedInEmail) {
      onAdminSignIn();
      return;
    }
    showDialog({
      title: words.signOutFirst,
      message: words.signOutFirstMessage(signedInEmail),
      tone: 'warning',
      actions: [
        { label: words.keepIt, style: 'cancel' },
        {
          label: words.signOutAndContinue,
          style: 'destructive',
          onPress: onAdminSignIn,
        },
      ],
    });
  }, [onAdminSignIn, signedInEmail, words]);

  const retry = useCallback(async () => {
    setChecking(true);
    try {
      await refetchAppStatus(client);
      setCheckedAt(new Date());
    } finally {
      setChecking(false);
    }
  }, [client]);

  const openStore = useCallback(async () => {
    const url = Platform.OS === 'ios' ? IOS_STORE_URL : ANDROID_STORE_URL;
    const storeName = Platform.OS === 'ios' ? words.appStore : words.playStore;
    try {
      if (!url) {
        throw new Error('No store page configured.');
      }
      await Linking.openURL(url);
    } catch {
      showDialog({
        title: words.openStore(storeName),
        message: words.searchInStore(storeName),
        tone: 'info',
      });
    }
  }, [words]);

  const contactSupport = useCallback(async () => {
    try {
      await Linking.openURL(
        `mailto:${supportEmail}?subject=${encodeURIComponent(words.mailSubject)}`,
      );
    } catch {
      showDialog({
        title: words.noMailApp,
        message: words.writeToUs(supportEmail),
        tone: 'info',
      });
    }
  }, [supportEmail, words]);

  const maintenance = gate === 'maintenance';

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View style={styles.brand}>
        <AppLogo size={44} />
      </View>

      <View style={styles.body}>
        <EmptyState
          art={
            <IconTile
              icon={maintenance ? Wrench : Sparkles}
              tileTone={maintenance ? 'warning' : 'primary'}
              tileSize={64}
              size={26}
              strokeWidth={1.7}
            />
          }
          title={maintenance ? words.backInAMoment : words.newerApp}
          message={
            maintenance
              ? `${status.maintenanceMessage ?? words.defaultMaintenance}${
                  checkedAt
                    ? words.stillClosed(
                        checkedAt.toLocaleTimeString(locale, {
                          hour: 'numeric',
                          minute: '2-digit',
                        }),
                      )
                    : ''
                }`
              : words.unsupported(APP_VERSION)
          }
          action={
            maintenance
              ? {
                  label: checking ? words.checking : words.tryAgain,
                  onPress: () => {
                    if (!checking) {
                      void retry();
                    }
                  },
                }
              : { label: words.updateApp, onPress: () => void openStore() }
          }
          link={{
            label: words.contactSupport,
            onPress: () => void contactSupport(),
          }}
        />
      </View>

      <View style={styles.footer}>
        <Text
          size={fontSize.captionSmall}
          leading={1.4}
          align="center"
          tone="faint"
        >
          {words.footer(supportEmail, APP_VERSION)}
        </Text>
        <TextButton
          label={words.adminSignIn}
          tone="muted"
          size={fontSize.captionSmall}
          onPress={adminSignIn}
          accessibilityHint={words.adminSignInHint}
        />
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  brand: {
    alignItems: 'center',
    paddingTop: 28,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  footer: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
});
