import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Compass, House, Library, UserRound } from 'lucide-react-native';

import { TabBar, type TabItem } from '@/components/navigation/TabBar';
import { ROUTES } from '@/constants/routes';

/**
 * The reader app's four tabs. Search became "Discover" in the redesign — the
 * tab is a browsing surface first and a search box second, so the label leads
 * with what it is rather than what it does.
 */
const TAB_ITEMS: Record<string, TabItem> = {
  [ROUTES.HOME]: { Icon: House, label: 'Home' },
  [ROUTES.SEARCH]: { Icon: Compass, label: 'Discover' },
  [ROUTES.MY_LIBRARY]: { Icon: Library, label: 'Library' },
  [ROUTES.PROFILE]: { Icon: UserRound, label: 'Profile' },
};

export function MainTabBar(props: BottomTabBarProps) {
  return <TabBar {...props} items={TAB_ITEMS} variant="reader" />;
}
