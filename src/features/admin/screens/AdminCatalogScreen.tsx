import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ListRow, Screen, ScreenHeader, Section } from '@/components/layout';
import { Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import type { AdminCatalogStackParamList } from '@/features/admin/navigation/types';
import { useAdminAuthors, useAdminCategories, useAdminCollections } from '@/hooks/useAdmin';

export function AdminCatalogScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminCatalogStackParamList>>();
  const { data: authors = [] } = useAdminAuthors();
  const { data: categories = [] } = useAdminCategories();
  const { data: collections = [] } = useAdminCollections();

  return (
    <Screen>
      <ScreenHeader title="Catalog" subtitle="Authors, categories, and shelves." />

      <View className="gap-7">
        <Section
          title="Authors"
          className="">
          <HeaderAction
            label="Add author"
            onPress={() => navigation.navigate(ADMIN_ROUTES.AUTHOR_EDITOR, {})}
          />
          {authors.map((author, index) => (
            <ListRow
              key={author.id}
              title={author.name}
              subtitle={author.slug}
              isLast={index === authors.length - 1}
              onPress={() => navigation.navigate(ADMIN_ROUTES.AUTHOR_EDITOR, { authorId: author.id })}
            />
          ))}
        </Section>

        <Section title="Categories">
          <HeaderAction
            label="Add category"
            onPress={() => navigation.navigate(ADMIN_ROUTES.CATEGORY_EDITOR, {})}
          />
          {categories.map((category, index) => (
            <ListRow
              key={category.id}
              title={category.label}
              subtitle={category.slug}
              isLast={index === categories.length - 1}
              onPress={() =>
                navigation.navigate(ADMIN_ROUTES.CATEGORY_EDITOR, { categoryId: category.id })
              }
            />
          ))}
        </Section>

        <Section title="Collections">
          <HeaderAction
            label="Add collection"
            onPress={() => navigation.navigate(ADMIN_ROUTES.COLLECTION_EDITOR, {})}
          />
          {collections.map((collection, index) => (
            <ListRow
              key={collection.id}
              title={collection.title}
              subtitle={`${collection.kind} · ${collection.book_ids.length} books`}
              isLast={index === collections.length - 1}
              onPress={() =>
                navigation.navigate(ADMIN_ROUTES.COLLECTION_EDITOR, {
                  collectionId: collection.id,
                })
              }
            />
          ))}
        </Section>
      </View>
    </Screen>
  );
}

function HeaderAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="border-b border-app-border px-4 py-3 dark:border-app-border-dark">
      <Text className="text-[15px] font-semibold text-app-primary dark:text-app-primary-dark">
        {label}
      </Text>
    </Pressable>
  );
}
