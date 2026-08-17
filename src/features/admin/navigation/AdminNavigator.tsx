import { View } from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminTabBar } from '@/features/admin/navigation/AdminTabBar';
import { AdminAuthorEditorScreen } from '@/features/admin/screens/AdminAuthorEditorScreen';
import { AdminBookEditorScreen } from '@/features/admin/screens/AdminBookEditorScreen';
import { AdminBooksScreen } from '@/features/admin/screens/AdminBooksScreen';
import { AdminCatalogScreen } from '@/features/admin/screens/AdminCatalogScreen';
import { AdminCategoryEditorScreen } from '@/features/admin/screens/AdminCategoryEditorScreen';
import { AdminCollectionEditorScreen } from '@/features/admin/screens/AdminCollectionEditorScreen';
import { AdminOverviewScreen } from '@/features/admin/screens/AdminOverviewScreen';
import { AdminPdfPreviewScreen } from '@/features/admin/screens/AdminPdfPreviewScreen';
import { AdminPeopleScreen } from '@/features/admin/screens/AdminPeopleScreen';
import { AdminUserDetailScreen } from '@/features/admin/screens/AdminUserDetailScreen';

import type {
  AdminBooksStackParamList,
  AdminCatalogStackParamList,
  AdminPeopleStackParamList,
  AdminTabParamList,
} from './types';

const Tab = createBottomTabNavigator<AdminTabParamList>();
const BooksStack = createNativeStackNavigator<AdminBooksStackParamList>();
const CatalogStack = createNativeStackNavigator<AdminCatalogStackParamList>();
const PeopleStack = createNativeStackNavigator<AdminPeopleStackParamList>();

const STACK_CONTENT_STYLE = { flex: 1 } as const;

function renderTabBar(props: BottomTabBarProps) {
  return <AdminTabBar {...props} />;
}

function AdminBooksNavigator() {
  return (
    <BooksStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: STACK_CONTENT_STYLE,
        animation: 'slide_from_right',
      }}>
      <BooksStack.Screen name={ADMIN_ROUTES.BOOK_LIST} component={AdminBooksScreen} />
      <BooksStack.Screen name={ADMIN_ROUTES.BOOK_EDITOR} component={AdminBookEditorScreen} />
      <BooksStack.Screen name={ADMIN_ROUTES.PDF_PREVIEW} component={AdminPdfPreviewScreen} />
    </BooksStack.Navigator>
  );
}

function AdminCatalogNavigator() {
  return (
    <CatalogStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: STACK_CONTENT_STYLE,
        animation: 'slide_from_right',
      }}>
      <CatalogStack.Screen name={ADMIN_ROUTES.CATALOG_HOME} component={AdminCatalogScreen} />
      <CatalogStack.Screen name={ADMIN_ROUTES.AUTHOR_EDITOR} component={AdminAuthorEditorScreen} />
      <CatalogStack.Screen
        name={ADMIN_ROUTES.CATEGORY_EDITOR}
        component={AdminCategoryEditorScreen}
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
    <PeopleStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: STACK_CONTENT_STYLE,
        animation: 'slide_from_right',
      }}>
      <PeopleStack.Screen name={ADMIN_ROUTES.PEOPLE_LIST} component={AdminPeopleScreen} />
      <PeopleStack.Screen name={ADMIN_ROUTES.USER_DETAIL} component={AdminUserDetailScreen} />
    </PeopleStack.Navigator>
  );
}

export function AdminNavigator() {
  return (
    <View className="flex-1">
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
      </Tab.Navigator>
    </View>
  );
}
