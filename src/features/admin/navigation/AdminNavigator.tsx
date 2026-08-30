import { View } from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminToastProvider } from '@/features/admin/components/AdminToast';
import { AdminTabBar } from '@/features/admin/navigation/AdminTabBar';
import { AdminAnalyticsScreen } from '@/features/admin/screens/AdminAnalyticsScreen';
import { AdminAuditLogScreen } from '@/features/admin/screens/AdminAuditLogScreen';
import { AdminAuthorEditorScreen } from '@/features/admin/screens/AdminAuthorEditorScreen';
import { AdminAuthorListScreen } from '@/features/admin/screens/AdminAuthorListScreen';
import { AdminBookEditorScreen } from '@/features/admin/screens/AdminBookEditorScreen';
import { AdminBooksScreen } from '@/features/admin/screens/AdminBooksScreen';
import { AdminCatalogScreen } from '@/features/admin/screens/AdminCatalogScreen';
import { AdminCategoryEditorScreen } from '@/features/admin/screens/AdminCategoryEditorScreen';
import { AdminCategoryListScreen } from '@/features/admin/screens/AdminCategoryListScreen';
import { AdminCollectionEditorScreen } from '@/features/admin/screens/AdminCollectionEditorScreen';
import { AdminCollectionListScreen } from '@/features/admin/screens/AdminCollectionListScreen';
import { AdminMediaScreen } from '@/features/admin/screens/AdminMediaScreen';
import { AdminOverviewScreen } from '@/features/admin/screens/AdminOverviewScreen';
import { AdminPdfPreviewScreen } from '@/features/admin/screens/AdminPdfPreviewScreen';
import { AdminPeopleScreen } from '@/features/admin/screens/AdminPeopleScreen';
import { AdminPlanEditorScreen } from '@/features/admin/screens/AdminPlanEditorScreen';
import { AdminPlanListScreen } from '@/features/admin/screens/AdminPlanListScreen';
import { AdminSettingsScreen } from '@/features/admin/screens/AdminSettingsScreen';
import { AdminSystemScreen } from '@/features/admin/screens/AdminSystemScreen';
import { AdminUserDetailScreen } from '@/features/admin/screens/AdminUserDetailScreen';

import type {
  AdminBooksStackParamList,
  AdminCatalogStackParamList,
  AdminPeopleStackParamList,
  AdminSystemStackParamList,
  AdminTabParamList,
} from './types';

const Tab = createBottomTabNavigator<AdminTabParamList>();
const BooksStack = createNativeStackNavigator<AdminBooksStackParamList>();
const CatalogStack = createNativeStackNavigator<AdminCatalogStackParamList>();
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

function AdminBooksNavigator() {
  return (
    <BooksStack.Navigator screenOptions={STACK_OPTIONS}>
      <BooksStack.Screen name={ADMIN_ROUTES.BOOK_LIST} component={AdminBooksScreen} />
      <BooksStack.Screen name={ADMIN_ROUTES.BOOK_EDITOR} component={AdminBookEditorScreen} />
      <BooksStack.Screen name={ADMIN_ROUTES.PDF_PREVIEW} component={AdminPdfPreviewScreen} />
    </BooksStack.Navigator>
  );
}

function AdminCatalogNavigator() {
  return (
    <CatalogStack.Navigator screenOptions={STACK_OPTIONS}>
      <CatalogStack.Screen name={ADMIN_ROUTES.CATALOG_HOME} component={AdminCatalogScreen} />
      <CatalogStack.Screen name={ADMIN_ROUTES.AUTHOR_LIST} component={AdminAuthorListScreen} />
      <CatalogStack.Screen name={ADMIN_ROUTES.AUTHOR_EDITOR} component={AdminAuthorEditorScreen} />
      <CatalogStack.Screen name={ADMIN_ROUTES.CATEGORY_LIST} component={AdminCategoryListScreen} />
      <CatalogStack.Screen
        name={ADMIN_ROUTES.CATEGORY_EDITOR}
        component={AdminCategoryEditorScreen}
      />
      <CatalogStack.Screen
        name={ADMIN_ROUTES.COLLECTION_LIST}
        component={AdminCollectionListScreen}
      />
      <CatalogStack.Screen
        name={ADMIN_ROUTES.COLLECTION_EDITOR}
        component={AdminCollectionEditorScreen}
      />
    </CatalogStack.Navigator>
  );
}

function AdminPeopleNavigator() {
  return (
    <PeopleStack.Navigator screenOptions={STACK_OPTIONS}>
      <PeopleStack.Screen name={ADMIN_ROUTES.PEOPLE_LIST} component={AdminPeopleScreen} />
      <PeopleStack.Screen name={ADMIN_ROUTES.USER_DETAIL} component={AdminUserDetailScreen} />
    </PeopleStack.Navigator>
  );
}

function AdminSystemNavigator() {
  return (
    <SystemStack.Navigator screenOptions={STACK_OPTIONS}>
      <SystemStack.Screen name={ADMIN_ROUTES.SYSTEM_HOME} component={AdminSystemScreen} />
      <SystemStack.Screen name={ADMIN_ROUTES.ANALYTICS} component={AdminAnalyticsScreen} />
      <SystemStack.Screen name={ADMIN_ROUTES.PLAN_LIST} component={AdminPlanListScreen} />
      <SystemStack.Screen name={ADMIN_ROUTES.PLAN_EDITOR} component={AdminPlanEditorScreen} />
      <SystemStack.Screen name={ADMIN_ROUTES.MEDIA} component={AdminMediaScreen} />
      <SystemStack.Screen name={ADMIN_ROUTES.AUDIT_LOG} component={AdminAuditLogScreen} />
      <SystemStack.Screen name={ADMIN_ROUTES.SETTINGS} component={AdminSettingsScreen} />
    </SystemStack.Navigator>
  );
}

export function AdminNavigator() {
  return (
    <AdminToastProvider>
      <View className="flex-1 bg-app-bg dark:bg-app-bg-dark">
        <Tab.Navigator
          tabBar={renderTabBar}
          screenOptions={{
            headerShown: false,
            lazy: true,
            freezeOnBlur: true,
            animation: 'none',
          }}>
          <Tab.Screen name={ADMIN_ROUTES.OVERVIEW} component={AdminOverviewScreen} />
          <Tab.Screen name={ADMIN_ROUTES.BOOKS} component={AdminBooksNavigator} />
          <Tab.Screen name={ADMIN_ROUTES.CATALOG} component={AdminCatalogNavigator} />
          <Tab.Screen name={ADMIN_ROUTES.PEOPLE} component={AdminPeopleNavigator} />
          <Tab.Screen name={ADMIN_ROUTES.SYSTEM} component={AdminSystemNavigator} />
        </Tab.Navigator>
      </View>
    </AdminToastProvider>
  );
}
