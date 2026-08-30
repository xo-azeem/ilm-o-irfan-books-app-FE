import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BookOpen, LayoutGrid, Library, SlidersHorizontal, Users } from 'lucide-react-native';

import { TabBar, type TabItem } from '@/components/navigation/TabBar';
import { ADMIN_ROUTES } from '@/constants/routes';

/**
 * Admin's five tabs. Square icons and no selection capsule, so the tool never
 * feels like the reading app it manages.
 */
const TAB_ITEMS: Record<string, TabItem> = {
  [ADMIN_ROUTES.OVERVIEW]: { Icon: LayoutGrid, label: 'Overview' },
  [ADMIN_ROUTES.BOOKS]: { Icon: BookOpen, label: 'Books' },
  [ADMIN_ROUTES.CATALOG]: { Icon: Library, label: 'Catalog' },
  [ADMIN_ROUTES.PEOPLE]: { Icon: Users, label: 'People' },
  [ADMIN_ROUTES.SYSTEM]: { Icon: SlidersHorizontal, label: 'System' },
};

export function AdminTabBar(props: BottomTabBarProps) {
  return <TabBar {...props} items={TAB_ITEMS} variant="admin" />;
}
