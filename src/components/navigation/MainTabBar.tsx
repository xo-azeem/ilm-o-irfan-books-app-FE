import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BookOpen, Home, Search, UserRound } from 'lucide-react-native';

import { GlassTabBar, type GlassTabItem } from '@/components/navigation/GlassTabBar';
import { ROUTES, ROUTE_LABELS } from '@/constants/routes';

const TAB_ITEMS: Record<string, GlassTabItem> = {
  [ROUTES.HOME]: { Icon: Home, label: ROUTE_LABELS[ROUTES.HOME] },
  [ROUTES.SEARCH]: { Icon: Search, label: ROUTE_LABELS[ROUTES.SEARCH] },
  [ROUTES.MY_LIBRARY]: { Icon: BookOpen, label: ROUTE_LABELS[ROUTES.MY_LIBRARY] },
  [ROUTES.PROFILE]: { Icon: UserRound, label: ROUTE_LABELS[ROUTES.PROFILE] },
};

export function MainTabBar(props: BottomTabBarProps) {
  return <GlassTabBar {...props} items={TAB_ITEMS} />;
}
