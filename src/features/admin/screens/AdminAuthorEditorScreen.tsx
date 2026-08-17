import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { Screen, ScreenHeader } from '@/components/layout';
import {
  AdminBackLink,
  AdminField,
  AdminPrimaryButton,
  AdminScreenBlock,
} from '@/features/admin/components/AdminUi';
import type { AdminCatalogStackParamList } from '@/features/admin/navigation/types';
import { useAdminAuthors, useDeleteAdminAuthor, useSaveAdminAuthor } from '@/hooks/useAdmin';
import { slugify } from '@/services/admin';

export function AdminAuthorEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AdminCatalogStackParamList, 'AdminAuthorEditor'>>();
  const authorId = route.params?.authorId;
  const { data: authors = [] } = useAdminAuthors();
  const existing = authors.find(item => item.id === authorId);
  const save = useSaveAdminAuthor();
  const remove = useDeleteAdminAuthor();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setSlug(existing.slug);
    setBio(existing.bio ?? '');
  }, [existing]);

  return (
    <Screen>
      <AdminBackLink />
      <ScreenHeader title={authorId ? 'Edit author' : 'New author'} />
      <AdminScreenBlock>
        <AdminField label="Name" value={name} onChangeText={setName} />
        <AdminField
          label="Slug"
          value={slug}
          onChangeText={setSlug}
          placeholder={slugify(name)}
          autoCapitalize="none"
        />
        <AdminField label="Bio" value={bio} onChangeText={setBio} multiline />
        <AdminPrimaryButton
          label={save.isPending ? 'Saving…' : 'Save'}
          disabled={save.isPending || !name.trim()}
          onPress={() =>
            save.mutate(
              { id: authorId, name, slug: slug || slugify(name), bio },
              {
                onSuccess: () => navigation.goBack(),
                onError: error =>
                  Alert.alert('Save failed', error instanceof Error ? error.message : 'Try again.'),
              },
            )
          }
        />
        {authorId ? (
          <AdminPrimaryButton
            label="Delete author"
            destructive
            onPress={() =>
              Alert.alert('Delete author?', 'Authors with books cannot be deleted.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () =>
                    remove.mutate(authorId, {
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
