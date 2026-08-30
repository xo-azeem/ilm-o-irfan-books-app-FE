import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppLogo } from '@/components/brand';
import { Button, Display, RadialGlow, Text } from '@/components/ui';
import { SPLASH_LOGO_SIZE } from '@/constants/images';
import type { OnboardingStackParamList } from '@/features/onboarding/navigation/types';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { layout } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The first screen a new reader sees. Two doors only: start exploring, or sign
 * in. Everything else — subjects, rhythm, an account — can wait until they have
 * seen a book they want.
 */
export function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const completeWithSignIn = useOnboardingStore(state => state.completeWithSignIn);

  const startExploring = useCallback(
    () => navigation.navigate('OnboardingSubjects'),
    [navigation],
  );
  // Leaves first-run entirely; the app stack opens on sign-in.
  const signIn = useCallback(() => completeWithSignIn(), [completeWithSignIn]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Two blooms: green from the top-left, a cooler gold from the bottom-right. */}
      <RadialGlow color={colors.primary} opacity={0.34} size={520} left={-90} top={-60} />
      <RadialGlow color={colors.gold} opacity={0.16} size={420} right={-120} bottom={-90} />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}>
        <AppLogo size={SPLASH_LOGO_SIZE} style={styles.logo} />

        <Display size={46} leading={1.06} tracking={-0.9}>
          {'Knowledge,\ncarried forward.'}
        </Display>

        <Text size={fontSize.body} leading={1.6} tone="muted" style={styles.blurb}>
          Seven decades of Ilm-o-Irfan's shelves, now in your pocket.
        </Text>

        <View style={styles.actions}>
          <Button label="Start exploring" onPress={startExploring} />
          <Button label="I already have an account" variant="secondary" onPress={signIn} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: layout.screenPadding + 8,
    gap: 22,
  },
  logo: {
    // A drop shadow the same green as the bloom, so the mark sits in the light.
    shadowColor: '#2D8A47',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
  },
  blurb: {
    maxWidth: 290,
  },
  actions: {
    marginTop: 14,
    gap: 12,
  },
});
