import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Layers, LayoutGrid, PenLine } from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { Card, IconTile, Label, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { errorMessage } from '@/features/admin/components/AdminToast';
import { AdminOrderableList, type OrderableItem } from '@/features/admin/components/AdminOrderableList';
import {
  AdminErrorState,
  AdminNavRow,
  AdminRowGroup,
  AdminTextAction,
} from '@/features/admin/components/AdminUi';
import {
  useAdminAuthors,
  useAdminCategories,
  useAdminCollections,
  useReorderCollections,
  useUpdateAdminCollection,
} from '@/hooks/useAdmin';
import { layout } from '@/theme/palette';
import { fontSize } from '@/theme/typography';

import type { AdminCatalogStackParamList } from '../navigation/types';

/**
 * Catalog.
 *
 * The three nav rows plus the orderable collection list, lifted onto the tab
 * root — merchandising Home takes one tap instead of three.
 */
export function AdminCatalogScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminCatalogStackParamList>>();
  const { data: authors = [] } = useAdminAuthors();
  const { data: categories = [] } = useAdminCategories();
  const { data: collections = [], error, refetch } = useAdminCollections();

  const reorder = useReorderCollections();
  const updateCollection = useUpdateAdminCollection();

  const rows = useMemo<OrderableItem[]>(
    () =>
      collections.map(collection => ({
        id: collection.id,
        label: collection.title,
        sublabel: `${collection.book_count} ${
          collection.book_count === 1 ? 'book' : 'books'
        } · ${collection.is_published ? 'visible' : 'hidden'}`,
        visible: collection.is_published,
      })),
    [collections],
  );

  const handleReorder = useCallback(
    (next: OrderableItem[]) => reorder.mutate(next.map(item => item.id)),
    [reorder],
  );

  const handleToggleVisible = useCallback(
    (id: string, visible: boolean) =>
      updateCollection.mutate({ id, changes: { is_published: visible } }),
    [updateCollection],
  );

  return (
    <Screen padding={layout.adminPadding} gap={16}>
      <ScreenHeader
        title="Catalog"
        dense
        subtitle="Authors, categories and the rows readers see."
      />

      <AdminRowGroup>
        <AdminNavRow
          label="Authors"
          value={String(authors.length)}
          onPress={() => navigation.navigate(ADMIN_ROUTES.AUTHOR_LIST)}
          leading={<IconTile icon={PenLine} tileTone="primary" tileSize={30} size={14} />}
        />
        <AdminNavRow
          label="Categories"
          value={String(categories.length)}
          onPress={() => navigation.navigate(ADMIN_ROUTES.CATEGORY_LIST)}
          leading={<IconTile icon={LayoutGrid} tileTone="lime" tileSize={30} size={14} />}
        />
        <AdminNavRow
          label="Collections"
          value={String(collections.length)}
          onPress={() => navigation.navigate(ADMIN_ROUTES.COLLECTION_LIST)}
          leading={<IconTile icon={Layers} tileTone="lime" tileSize={30} size={14} />}
        />
      </AdminRowGroup>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Label size={fontSize.labelSmall + 0.5} tracking={1.4}>
            Home row order
          </Label>
          <AdminTextAction
            label="Add collection"
            onPress={() => navigation.navigate(ADMIN_ROUTES.COLLECTION_EDITOR, {})}
          />
        </View>

        {error ? (
          <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
        ) : (
          <AdminOrderableList
            items={rows}
            onChange={handleReorder}
            onToggleVisible={handleToggleVisible}
            emptyLabel="No collections yet. Add one to build a Home row."
          />
        )}
      </View>

      <Card tone="alt" padded={15} gap={9}>
        <Text size={13.5} leading={1.2} weight="500">
          Merchandising notes
        </Text>
        <Text size={12.5} leading={1.55} tone="muted">
          Collections are the curated rows on Home. Categories power the Discover tiles and the
          search filters. Hidden collections stay linkable but disappear from Home.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 11,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
});
