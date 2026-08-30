import type { PropsWithChildren, ReactNode } from 'react';
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

import { Screen, ScreenHeader } from '@/components/layout';

export type ProfileSubScreenLayoutProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  /** Right-aligned header action, e.g. a Save button. */
  action?: ReactNode;
  /** Pinned above the tab bar — a sticky save bar or a destructive action. */
  overlay?: ReactNode;
  gap?: number;
}>;

/**
 * Every screen in the profile stack shares this frame: a back chevron on its
 * own line, then the serif heading and an optional line of guidance.
 */
export function ProfileSubScreenLayout({
  title,
  subtitle,
  action,
  overlay,
  gap = 22,
  children,
}: ProfileSubScreenLayoutProps) {
  const navigation = useNavigation();
  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <Screen gap={gap} overlay={overlay}>
      <ScreenHeader title={title} subtitle={subtitle} action={action} onBack={goBack} />
      {children}
    </Screen>
  );
}
