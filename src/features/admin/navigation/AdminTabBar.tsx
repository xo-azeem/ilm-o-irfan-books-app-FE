import { useMemo } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Clock, Library, Settings, User } from 'lucide-react-native';

import { TabBar, type TabItem } from '@/components/navigation/TabBar';
import { ADMIN_ROUTES } from '@/constants/routes';
import { useStrings } from '@/i18n';

/**
 * Admin's four tabs, named for the job rather than the table: what needs me
 * now, everything readers see, the readers themselves, and the weekly jobs.
 * Square icons and no selection capsule, so the tool never feels like the
 * reading app it manages.
 */

export function AdminTabBar(props: BottomTabBarProps) {
  const s = useStrings();
  const items = useMemo<Record<string, TabItem>>(
    () => ({
      [ADMIN_ROUTES.TODAY]: { Icon: Clock, label: s.admin.tabs.today },
      [ADMIN_ROUTES.LIBRARY]: { Icon: Library, label: s.admin.tabs.library },
      [ADMIN_ROUTES.PEOPLE]: { Icon: User, label: s.admin.tabs.people },
      [ADMIN_ROUTES.SYSTEM]: { Icon: Settings, label: s.admin.tabs.system },
    }),
    [s],
  );
  return <TabBar {...props} items={items} variant="admin" />;
}
