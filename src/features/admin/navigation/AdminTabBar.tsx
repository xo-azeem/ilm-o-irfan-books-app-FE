import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BookOpen, LayoutDashboard, Library, SlidersHorizontal, Users } from 'lucide-react-native';

import { GlassTabBar, type GlassTabItem } from '@/components/navigation/GlassTabBar';
import { ADMIN_ROUTES } from '@/constants/routes';

const TAB_ITEMS: Record<string, GlassTabItem> = {
  [ADMIN_ROUTES.OVERVIEW]: { Icon: LayoutDashboard, label: 'Overview' },
  [ADMIN_ROUTES.BOOKS]: { Icon: BookOpen, label: 'Books' },
  [ADMIN_ROUTES.CATALOG]: { Icon: Library, label: 'Catalog' },
  [ADMIN_ROUTES.PEOPLE]: { Icon: Users, label: 'People' },
  [ADMIN_ROUTES.SYSTEM]: { Icon: SlidersHorizontal, label: 'System' },
};

export function AdminTabBar(props: BottomTabBarProps) {
  return <GlassTabBar {...props} items={TAB_ITEMS} />;
}
