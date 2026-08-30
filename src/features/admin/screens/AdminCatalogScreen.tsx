import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LayoutGrid, Layers, PenLine } from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminCard, AdminNavRow } from '@/features/admin/components/AdminUi';
import { useAdminAuthors, useAdminCategories, useAdminCollections } from '@/hooks/useAdmin';

import type { AdminCatalogStackParamList } from '../navigation/types';

export function AdminCatalogScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminCatalogStackParamList>>();
  const { data: authors = [] } = useAdminAuthors();
  const { data: categories = [] } = useAdminCategories();
  const { data: collections = [] } = useAdminCollections();

  const publishedCollections = collections.filter(item => item.is_published).length;
  const unassigned = categories.filter(item => item.book_count === 0).length;

  return (
    <Screen>
      <ScreenHeader
        title="Catalog"
        subtitle="Authors, categories, and the shelves readers browse."
      />

      <View className="gap-6">
        <AdminCard padded={false}>
          <AdminNavRow
            label="Authors"
            value={`${authors.length}`}
            Icon={PenLine}
            onPress={() => navigation.navigate(ADMIN_ROUTES.AUTHOR_LIST)}
          />
          <AdminNavRow
            label="Categories"
            value={`${categories.length}`}
            Icon={LayoutGrid}
            onPress={() => navigation.navigate(ADMIN_ROUTES.CATEGORY_LIST)}
          />
          <AdminNavRow
            label="Collections"
            value={`${publishedCollections}/${collections.length} live`}
            Icon={Layers}
            isLast
            onPress={() => navigation.navigate(ADMIN_ROUTES.COLLECTION_LIST)}
          />
        </AdminCard>

        <AdminCard title="Merchandising notes">
          <View className="gap-2">
            <Note
              text={`${collections.filter(item => item.kind === 'hero').length} hero shelf/shelves drive the Home carousel.`}
            />
            <Note text={`${unassigned} categories have no books assigned.`} />
            <Note
              text={`${
                collections.filter(item => item.book_count === 0).length
              } collections are empty and will not render.`}
            />
          </View>
        </AdminCard>
      </View>
    </Screen>
  );
}

function Note({ text }: { text: string }) {
  return (
    <Text className="text-[13px] leading-[19px] text-app-muted dark:text-app-muted-dark">
      • {text}
    </Text>
  );
}
