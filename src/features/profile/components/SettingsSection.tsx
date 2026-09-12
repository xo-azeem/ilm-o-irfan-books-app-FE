import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SectionHeader, SettingsGroup, SettingsRow } from '@/components/ui';
import { SignOutButton } from '@/features/profile/components/SignOutButton';
import { profileGroups } from '@/features/profile/data/profileContent';
import type {
  ProfileStackParamList,
  ProfileStackScreen,
} from '@/features/profile/navigation/types';
import { useLibrary, useSubscription } from '@/hooks/useAccount';
import { useAuthStore } from '@/stores/authStore';
import { THEME_PREFERENCE_LABELS, useThemeStore } from '@/stores/themeStore';

type ProfileNavigation = NativeStackNavigationProp<
  ProfileStackParamList,
  'ProfileMain'
>;

/**
 * The settings menu, inlined beneath the reading record.
 *
 * Exactly the groups the app has always had, with the coloured icon tiles kept.
 * Live values on the right — plan, theme, download count — so the reader can
 * answer most questions without opening anything. Every row pushes its own
 * screen onto the profile stack, and each of those pops straight back here.
 * Identity lives in the profile header above, so nothing repeats it here.
 *
 * Reads its own account queries rather than taking them as props: they share
 * the profile screen's cache, so this costs no extra requests and keeps the
 * section droppable anywhere in the stack.
 *
 * Signed-out readers still get the menu — appearance, language and help are
 * theirs too — but not the sign-out button, which would describe an account
 * that isn't there.
 */
export const SettingsSection = memo(function SettingsSection() {
  const navigation = useNavigation<ProfileNavigation>();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const { data: library } = useLibrary();
  const { data: subscription } = useSubscription();
  const themePreference = useThemeStore(state => state.themePreference);

  const navigate = useCallback(
    (screen: ProfileStackScreen) => navigation.navigate(screen),
    [navigation],
  );

  const planName = subscription?.active
    ? (subscription.plan?.name ?? 'Premium')
    : 'Free';

  // Live values are resolved here rather than baked into the static content, so
  // the menu can never show a stale plan or download count.
  const values = useMemo<Partial<Record<string, string>>>(
    () => ({
      'row-subscription': planName,
      'row-downloads': String(library?.downloadsCount ?? 0),
      'row-appearance': THEME_PREFERENCE_LABELS[themePreference],
      'row-language': 'English',
      'row-notifications': 'On',
    }),
    [library?.downloadsCount, planName, themePreference],
  );

  return (
    <View style={styles.root}>
      <SectionHeader title="Settings" variant="display" />

      {profileGroups.map(group => (
        <SettingsGroup key={group.id} title={group.title}>
          {group.rows.map(row => (
            <SettingsRow
              key={row.id}
              title={row.label}
              value={values[row.id]}
              icon={row.icon}
              iconTone={row.iconTone}
              onPress={row.screen ? () => navigate(row.screen!) : undefined}
            />
          ))}
        </SettingsGroup>
      ))}

      {/* The one destructive action, on its own outside the groups so it can't
          be tapped by accident — and behind a confirmation sheet besides. */}
      {isAuthenticated ? <SignOutButton /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },
});
