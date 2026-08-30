import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AuthReturnTo, RootStackParamList } from '@/app/navigation/types';
import { Button, DashedShelf, Display, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { fontSize } from '@/theme/typography';

/**
 * The signed-out stand-in for a personal surface — the library, the reading
 * record, saved books. Same shape as an empty state, because that is what it
 * is: a shelf that has not been filled yet.
 */
export function GuestAuthPanel({
  title,
  message,
  returnTo,
}: {
  title: string;
  message: string;
  /** Sends the reader back to the book they were opening once signed in. */
  returnTo?: AuthReturnTo;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const signIn = useCallback(
    () => navigation.navigate(ROUTES.LOGIN, returnTo ? { returnTo } : undefined),
    [navigation, returnTo],
  );

  const createAccount = useCallback(
    () => navigation.navigate(ROUTES.SIGN_UP, returnTo ? { returnTo } : undefined),
    [navigation, returnTo],
  );

  return (
    <View style={styles.root}>
      <DashedShelf />

      <Display size={27} align="center">
        {title}
      </Display>
      <Text size={fontSize.bodySmall} leading={1.65} align="center" tone="muted">
        {message}
      </Text>

      <View style={styles.actions}>
        <Button label="Sign in" onPress={signIn} size="md" />
        <Button label="Create an account" variant="secondary" onPress={createAccount} size="md" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 18,
    paddingTop: 24,
    paddingHorizontal: 12,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 11,
    marginTop: 2,
  },
});
