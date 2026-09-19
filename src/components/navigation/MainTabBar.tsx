import { useMemo } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Compass, House, Library, UserRound } from 'lucide-react-native';

import { TabBar, type TabItem } from '@/components/navigation/TabBar';
import { ROUTES } from '@/constants/routes';
import { useStrings } from '@/i18n';

/**
 * The reader app's four tabs. Search became "Discover" in the redesign — the
 * tab is a browsing surface first and a search box second, so the label leads
 * with what it is rather than what it does.
 */
export function MainTabBar(props: BottomTabBarProps) {
  const s = useStrings();
  const items = useMemo<Record<string, TabItem>>(
    () => ({
      [ROUTES.HOME]: { Icon: House, label: s.tabs.home },
      [ROUTES.SEARCH]: { Icon: Compass, label: s.tabs.discover },
      [ROUTES.MY_LIBRARY]: { Icon: Library, label: s.tabs.library },
      [ROUTES.PROFILE]: { Icon: UserRound, label: s.tabs.profile },
    }),
    [s],
  );
  return <TabBar {...props} items={items} variant="reader" />;
}
