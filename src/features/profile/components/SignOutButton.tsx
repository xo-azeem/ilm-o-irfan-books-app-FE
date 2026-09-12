import { memo, useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { LogOut } from 'lucide-react-native';

import { Button, Sheet, Text, useSheet } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/authStore';
import { fontSize } from '@/theme/typography';

/**
 * The one destructive action on the profile tab, with its own confirmation.
 *
 * Self-contained on purpose: the sheet's open/closed state and the in-flight
 * flag live here, so tapping the button re-renders this component alone and
 * not the settings groups above it. The sheet's `Modal` mounts no native view
 * while closed, and its back-button listener is only attached while open, so
 * the idle cost is a handful of memoised callbacks.
 *
 * On success the root stack is reset to the sign-in screen: the reader has
 * just chosen to leave, so a Back gesture returning them to a signed-out
 * profile would read as the sign-out not having taken. Sign-in still offers
 * "Continue as guest" and "Create an account", so nobody is trapped there.
 */
export const SignOutButton = memo(function SignOutButton() {
  const navigation = useNavigation();
  const sheet = useSheet();
  const [pending, setPending] = useState(false);

  const confirm = useCallback(async () => {
    setPending(true);
    try {
      // The store's sign-out drops the local session even when the network call
      // fails, so the reader is signed out either way and the redirect stands.
      await useAuthStore.getState().signOut();
    } catch {
      // Already handled by the store's `finally`; nothing left to tell the reader.
    } finally {
      setPending(false);
    }
    sheet.close();
    // `reset` bubbles up from the profile stack, through the tabs, to the root
    // navigator — the first one that owns the Login route handles it.
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: ROUTES.LOGIN }] }));
  }, [navigation, sheet]);

  // Ignore dismiss taps while the request is in flight, so the sheet cannot be
  // closed under a spinner and reopened to a second, overlapping sign-out.
  const close = useCallback(() => {
    if (!pending) {
      sheet.close();
    }
  }, [pending, sheet]);

  return (
    <>
      <Button
        label="Sign out"
        icon={LogOut}
        variant="danger"
        size="md"
        onPress={sheet.open}
        style={styles.button}
      />

      <Sheet
        visible={sheet.visible}
        onClose={close}
        title="Sign out?"
        scrollable={false}
        footer={
          <View style={styles.actions}>
            <Button label="Sign out" variant="dangerSolid" loading={pending} onPress={confirm} />
            <Button label="Cancel" variant="ghost" disabled={pending} onPress={close} />
          </View>
        }>
        <Text size={fontSize.bodySmall} leading={1.45} tone="muted">
          Your streak, finished books and downloads stay on your account. Sign back in at any
          time to pick up where you left off.
        </Text>
      </Sheet>
    </>
  );
});

const styles = StyleSheet.create({
  button: {
    marginTop: 2,
  },
  actions: {
    gap: 10,
  },
});
