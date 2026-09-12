import { StyleSheet, View } from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { TAB_TRANSITION } from '@/components/navigation/tabTransition';
import { ADMIN_ROUTES } from '@/constants/routes';
import { useTheme } from '@/theme/ThemeContext';
import { AdminToastProvider } from '@/features/admin/components/AdminToast';
import { AdminTabBar } from '@/features/admin/navigation/AdminTabBar';
import { AdminAnalyticsScreen } from '@/features/admin/screens/AdminAnalyticsScreen';
import { AdminAuthorEditorScreen } from '@/features/admin/screens/AdminAuthorEditorScreen';
import { AdminBookEditorScreen } from '@/features/admin/screens/AdminBookEditorScreen';
import { AdminCategoryEditorScreen } from '@/features/admin/screens/AdminCategoryEditorScreen';
import { AdminCollectionEditorScreen } from '@/features/admin/screens/AdminCollectionEditorScreen';
import { AdminHistoryScreen } from '@/features/admin/screens/AdminHistoryScreen';
import { AdminLibraryScreen } from '@/features/admin/screens/AdminLibraryScreen';
import { AdminPdfPreviewScreen } from '@/features/admin/screens/AdminPdfPreviewScreen';
import { AdminPeopleScreen } from '@/features/admin/screens/AdminPeopleScreen';
import { AdminPlanEditorScreen } from '@/features/admin/screens/AdminPlanEditorScreen';
import { AdminSettingsScreen } from '@/features/admin/screens/AdminSettingsScreen';
import { AdminStorageScreen } from '@/features/admin/screens/AdminStorageScreen';
import { AdminSystemScreen } from '@/features/admin/screens/AdminSystemScreen';
import { AdminTodayScreen } from '@/features/admin/screens/AdminTodayScreen';
import { AdminUserDetailScreen } from '@/features/admin/screens/AdminUserDetailScreen';

import type {
  AdminLibraryStackParamList,
  AdminPeopleStackParamList,
  AdminSystemStackParamList,
  AdminTabParamList,
} from './types';

const Tab = createBottomTabNavigator<AdminTabParamList>();
const LibraryStack = createNativeStackNavigator<AdminLibraryStackParamList>();
const PeopleStack = createNativeStackNavigator<AdminPeopleStackParamList>();
const SystemStack = createNativeStackNavigator<AdminSystemStackParamList>();

const STACK_OPTIONS = {
  headerShown: false,
  contentStyle: { flex: 1 },
  animation: 'slide_from_right',
} as const;

function renderTabBar(props: BottomTabBarProps) {
  return <AdminTabBar {...props} />;
}

/** Books, authors, categories and shelves — one list screen and its editors. */
function AdminLibraryNavigator() {
  return (
    <LibraryStack.Navigator screenOptions={STACK_OPTIONS}>
      <LibraryStack.Screen name={ADMIN_ROUTES.LIBRARY_HOME} component={AdminLibraryScreen} />
      <LibraryStack.Screen name={ADMIN_ROUTES.BOOK_EDITOR} component={AdminBookEditorScreen} />
      <LibraryStack.Screen name={ADMIN_ROUTES.PDF_PREVIEW} component={AdminPdfPreviewScreen} />
      <LibraryStack.Screen name={ADMIN_ROUTES.AUTHOR_EDITOR} component={AdminAuthorEditorScreen} />
      <LibraryStack.Screen
        name={ADMIN_ROUTES.CATEGORY_EDITOR}
        component={AdminCategoryEditorScreen}
      />
      <LibraryStack.Screen
        name={ADMIN_ROUTES.COLLECTION_EDITOR}
        component={AdminCollectionEditorScreen}
      />
    </LibraryStack.Navigator>
  );
}

/** Readers and the plans behind their access. */
function AdminPeopleNavigator() {
  return (
    <PeopleStack.Navigator screenOptions={STACK_OPTIONS}>
      <PeopleStack.Screen name={ADMIN_ROUTES.PEOPLE_HOME} component={AdminPeopleScreen} />
      <PeopleStack.Screen name={ADMIN_ROUTES.USER_DETAIL} component={AdminUserDetailScreen} />
      <PeopleStack.Screen name={ADMIN_ROUTES.PLAN_EDITOR} component={AdminPlanEditorScreen} />
    </PeopleStack.Navigator>
  );
}

/** The four things you visit weekly, not hourly. */
function AdminSystemNavigator() {
  return (
    <SystemStack.Navigator screenOptions={STACK_OPTIONS}>
      <SystemStack.Screen name={ADMIN_ROUTES.SYSTEM_HOME} component={AdminSystemScreen} />
      <SystemStack.Screen name={ADMIN_ROUTES.ANALYTICS} component={AdminAnalyticsScreen} />
      <SystemStack.Screen name={ADMIN_ROUTES.STORAGE} component={AdminStorageScreen} />
      <SystemStack.Screen name={ADMIN_ROUTES.HISTORY} component={AdminHistoryScreen} />
      <SystemStack.Screen name={ADMIN_ROUTES.SETTINGS} component={AdminSettingsScreen} />
    </SystemStack.Navigator>
  );
}

export function AdminNavigator() {
  const { colors } = useTheme();

  return (
    <AdminToastProvider>
      <View style={[adminStyles.root, { backgroundColor: colors.background }]}>
        <Tab.Navigator
          tabBar={renderTabBar}
          screenOptions={{
            headerShown: false,
            lazy: true,
            freezeOnBlur: true,
            ...TAB_TRANSITION,
          }}>
          <Tab.Screen name={ADMIN_ROUTES.TODAY} component={AdminTodayScreen} />
          <Tab.Screen name={ADMIN_ROUTES.LIBRARY} component={AdminLibraryNavigator} />
          <Tab.Screen name={ADMIN_ROUTES.PEOPLE} component={AdminPeopleNavigator} />
          <Tab.Screen name={ADMIN_ROUTES.SYSTEM} component={AdminSystemNavigator} />
        </Tab.Navigator>
      </View>
    </AdminToastProvider>
  );
}

const adminStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
