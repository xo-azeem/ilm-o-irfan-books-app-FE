import { useCallback, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChartColumn, LogOut } from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import {
  Avatar,
  Badge,
  Card,
  Icon,
  IconButton,
  SettingsGroup,
  SettingsRow,
  Text,
} from '@/components/ui';
import { profileGroups } from '@/features/profile/data/profileContent';
import type {
  ProfileStackParamList,
  ProfileStackScreen,
} from '@/features/profile/navigation/types';
import { useLibrary, useProfile, useSubscription } from '@/hooks/useAccount';
import { signOut } from '@/lib/supabase';
import { THEME_PREFERENCE_LABELS, useThemeStore } from '@/stores/themeStore';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

type SettingsNavigation = NativeStackNavigationProp<ProfileStackParamList, 'Settings'>;

/**
 * The settings menu.
 *
 * Exactly the groups the app has always had, with the coloured icon tiles kept.
 * Live values on the right — plan, theme, download count — so the reader can
 * answer most questions without opening anything.
 */
export function SettingsScreen() {
  const navigation = useNavigation<SettingsNavigation>();
  const { colors } = useTheme();
  const { data: profile } = useProfile();
  const { data: library } = useLibrary();
  const { data: subscription } = useSubscription();
  const themePreference = useThemeStore(state => state.themePreference);

  const goToRecord = useCallback(() => navigation.navigate('ProfileMain'), [navigation]);

  const navigate = useCallback(
    (screen: ProfileStackScreen) => navigation.navigate(screen),
    [navigation],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'You can sign back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }, []);

  const planName = subscription?.active ? subscription.plan?.name ?? 'Premium' : 'Free';

  // Live values are resolved here rather than baked into the static content, so
  // the menu can never show a stale plan or download count.
  const values = useMemo<Partial<Record<string, string>>>(
    () => ({
      'row-subscription': planName,
      'row-downloads': String(library?.downloads.length ?? 0),
      'row-appearance': THEME_PREFERENCE_LABELS[themePreference],
      'row-language': 'English',
      'row-notifications': 'On',
    }),
    [library?.downloads.length, planName, themePreference],
  );

  return (
    <Screen gap={16}>
      <ScreenHeader
        title="Settings"
        onBack={() => navigation.goBack()}
        // A glyph rather than a label, so the top row is a matched pair of
        // buttons and the heading below keeps the full width of the page.
        action={
          <IconButton
            icon={ChartColumn}
            onPress={goToRecord}
            variant="plain"
            buttonSize={36}
            size={17}
            accessibilityLabel="Reading record"
          />
        }
      />

      <Card tone="surface" padded={14} style={styles.identity}>
        <Avatar name={profile?.fullName} size={46} shape="squircle" />
        <View style={styles.identityBody}>
          <Text size={15.5} leading={1} weight="500" numberOfLines={1}>
            {profile?.fullName || 'Reader'}
          </Text>
          {profile?.email ? (
            <Text size={12.5} leading={1} tone="muted" numberOfLines={1}>
              {profile.email}
            </Text>
          ) : null}
        </View>
        <Badge
          label={planName.toUpperCase()}
          tone={subscription?.active ? 'gold' : 'neutral'}
          bordered
        />
      </Card>

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

      {/* The one destructive action, framed in red rather than sitting in a
          group where it could be tapped by accident. */}
      <Pressable
        accessibilityRole="button"
        onPress={handleSignOut}
        style={({ pressed }) => [
          styles.signOut,
          { backgroundColor: colors.dangerFill, borderColor: colors.dangerBorder },
          pressed && styles.pressed,
        ]}>
        <Icon icon={LogOut} size={15} tone="danger" />
        <Text size={fontSize.body} leading={1} weight="500" tone="danger">
          Sign out
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  identityBody: {
    flex: 1,
    gap: 4,
  },
  signOut: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
