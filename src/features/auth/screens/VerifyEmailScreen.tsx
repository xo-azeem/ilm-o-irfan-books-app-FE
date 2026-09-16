import { useLayoutEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { ROUTES } from '@/constants/routes';

/**
 * Confirm your email.
 *
 * Kept as a route because sign-up and a refused sign-in navigate here; the
 * screen itself is the shared code screen in its `signup` flavour, so this
 * only forwards. See `EnterCodeScreen`.
 */
export function VerifyEmailScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'VerifyEmail'>>();
  const { email, returnTo } = route.params;

  useLayoutEffect(() => {
    navigation.replace(ROUTES.ENTER_CODE, {
      flow: 'signup',
      email,
      ...(returnTo ? { returnTo } : null),
    });
  }, [email, navigation, returnTo]);

  return null;
}
