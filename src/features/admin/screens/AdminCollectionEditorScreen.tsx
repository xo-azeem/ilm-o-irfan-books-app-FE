import { useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { Screen, ScreenHeader } from '@/components/layout';
import { Text } from '@/components/ui';
import {
  AdminBackLink,
  AdminChip,
  AdminField,
  AdminPrimaryButton,
  AdminScreenBlock,
} from '@/features/admin/components/AdminUi';
import type { AdminCatalogStackParamList } from '@/features/admin/navigation/types';
import {
  useAdminBooks,
  useAdminCollections,
  useDeleteAdminCollection,
  useSaveAdminCollection,
} from '@/hooks/useAdmin';
import { slugify, type AdminCollection } from '@/services/admin';
import { palette } from '@/theme/palette';

const KINDS: AdminCollection['kind'][] = ['hero', 'shelf', 'carousel'];

export function AdminCollectionEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AdminCatalogStackParamList, 'AdminCollectionEditor'>>();
  const collectionId = route.params?.collectionId;
  const { data: collections = [] } = useAdminCollections();
  const { data: books = [] } = useAdminBooks('');
  const existing = collections.find(item => item.id === collectionId);
  const save = useSaveAdminCollection();
  const remove = useDeleteAdminCollection();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [accent, setAccent] = useState(palette.green as string);
  const [kind, setKind] = useState<AdminCollection['kind']>('shelf');
  const [sortOrder, setSortOrder] = useState('0');
  const [isPublished, setIsPublished] = useState(true);
  const [bookIds, setBookIds] = useState<string[]>([]);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setSlug(existing.slug);
    setSubtitle(existing.subtitle ?? '');
    setAccent(existing.accent ?? palette.green);
    setKind(existing.kind);
    setSortOrder(String(existing.sort_order));
    setIsPublished(existing.is_published);
    setBookIds(existing.book_ids);
  }, [existing]);

  return (
    <Screen>
      <AdminBackLink />
      <ScreenHeader title={collectionId ? 'Edit collection' : 'New collection'} />
      <AdminScreenBlock>
        <AdminField label="Title" value={title} onChangeText={setTitle} />
        <AdminField
          label="Slug"
          value={slug}
          onChangeText={setSlug}
          placeholder={slugify(title)}
          autoCapitalize="none"
        />
        <AdminField label="Subtitle" value={subtitle} onChangeText={setSubtitle} />
        <AdminField label="Accent" value={accent} onChangeText={setAccent} autoCapitalize="none" />
        <AdminField
          label="Sort order"
          value={sortOrder}
          onChangeText={setSortOrder}
          keyboardType="number-pad"
        />

        <View className="flex-row flex-wrap gap-2">
          {KINDS.map(item => (
            <AdminChip key={item} label={item} selected={kind === item} onPress={() => setKind(item)} />
          ))}
        </View>

        <View className="flex-row items-center justify-between rounded-[12px] bg-app-surface px-4 py-3 dark:bg-app-surface-dark">
          <Text className="text-[16px] text-app-ink dark:text-app-ink-dark">Published</Text>
          <Switch value={isPublished} onValueChange={setIsPublished} />
        </View>

        <Text className="px-1 text-[13px] font-medium text-app-muted dark:text-app-muted-dark">
          Books
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {books.map(book => (
            <AdminChip
              key={book.id}
              label={book.title}
              selected={bookIds.includes(book.id)}
              onPress={() =>
                setBookIds(current =>
                  current.includes(book.id)
                    ? current.filter(id => id !== book.id)
                    : [...current, book.id],
                )
              }
            />
          ))}
        </View>

        <AdminPrimaryButton
          label={save.isPending ? 'Saving…' : 'Save'}
          disabled={save.isPending || !title.trim()}
          onPress={() =>
            save.mutate(
              {
                id: collectionId,
                title,
                slug: slug || slugify(title),
                subtitle,
                accent,
                kind,
                sort_order: Number(sortOrder) || 0,
                is_published: isPublished,
                book_ids: bookIds,
              },
              {
                onSuccess: () => navigation.goBack(),
                onError: error =>
                  Alert.alert('Save failed', error instanceof Error ? error.message : 'Try again.'),
              },
            )
          }
        />
        {collectionId ? (
          <AdminPrimaryButton
            label="Delete collection"
            destructive
            onPress={() =>
              Alert.alert('Delete collection?', 'Books themselves are not deleted.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () =>
                    remove.mutate(collectionId, {
                      onSuccess: () => navigation.goBack(),
                      onError: error =>
                        Alert.alert(
                          'Delete failed',
                          error instanceof Error ? error.message : 'Try again.',
                        ),
                    }),
                },
              ])
            }
          />
        ) : null}
      </AdminScreenBlock>
    </Screen>
  );
}
