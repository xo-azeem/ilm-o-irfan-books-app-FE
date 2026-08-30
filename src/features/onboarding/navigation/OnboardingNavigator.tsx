import { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RhythmScreen } from '@/features/onboarding/screens/RhythmScreen';
import { SubjectsScreen } from '@/features/onboarding/screens/SubjectsScreen';
import { WelcomeScreen } from '@/features/onboarding/screens/WelcomeScreen';
import { useTheme } from '@/theme/ThemeContext';

import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * The first-run flow: splash → subjects → rhythm.
 *
 * Auth deliberately lives outside this stack. Completing or skipping flips the
 * persisted flag and the root navigator swaps to the app, which then opens on
 * Home or on sign-in depending on how the reader left first-run.
 */
export function OnboardingNavigator() {
  const { colors } = useTheme();
  const contentStyle = useMemo(
    () => ({ flex: 1, backgroundColor: colors.background }),
    [colors.background],
  );

  return (
    <Stack.Navigator
      initialRouteName="OnboardingWelcome"
      screenOptions={{ headerShown: false, contentStyle }}>
      <Stack.Screen
        name="OnboardingWelcome"
        component={WelcomeScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen name="OnboardingSubjects" component={SubjectsScreen} />
      <Stack.Screen name="OnboardingRhythm" component={RhythmScreen} />
    </Stack.Navigator>
  );
}
