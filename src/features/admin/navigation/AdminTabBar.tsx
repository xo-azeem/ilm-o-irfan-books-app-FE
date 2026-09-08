import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Clock, Library, Settings, User } from 'lucide-react-native';

import { TabBar, type TabItem } from '@/components/navigation/TabBar';
import { ADMIN_ROUTES } from '@/constants/routes';

/**
 * Admin's four tabs, named for the job rather than the table: what needs me
 * now, everything readers see, the readers themselves, and the weekly jobs.
 * Square icons and no selection capsule, so the tool never feels like the
 * reading app it manages.
 */
const TAB_ITEMS: Record<string, TabItem> = {
  [ADMIN_ROUTES.TODAY]: { Icon: Clock, label: 'Today' },
  [ADMIN_ROUTES.LIBRARY]: { Icon: Library, label: 'Library' },
  [ADMIN_ROUTES.PEOPLE]: { Icon: User, label: 'People' },
  [ADMIN_ROUTES.SYSTEM]: { Icon: Settings, label: 'System' },
};

export function AdminTabBar(props: BottomTabBarProps) {
  return <TabBar {...props} items={TAB_ITEMS} variant="admin" />;
}
