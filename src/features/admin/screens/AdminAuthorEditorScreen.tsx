import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { ImageUp, User } from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { Text } from '@/components/ui';
import { AdminConfirmSheet } from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminButton,
  AdminCard,
  AdminField,
  AdminHelper,
} from '@/features/admin/components/AdminUi';
import { useDirtyTracker, useUnsavedGuard } from '@/features/admin/hooks/useAdminForm';
import { useAdminAuthors, useDeleteAdminAuthor, useSaveAdminAuthor } from '@/hooks/useAdmin';
import {
  adminCoverUrl,
  slugify,
  uploadAdminAvatar,
  validateCoverSize,
} from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminCatalogStackParamList } from '../navigation/types';

export function AdminAuthorEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AdminCatalogStackParamList, 'AdminAuthorEditor'>>();
  const authorId = route.params?.authorId;
  const { colors } = useTheme();
  const toast = useToast();

  const { data: authors = [] } = useAdminAuthors();
  const existing = authors.find(item => item.id === authorId);
  const save = useSaveAdminAuthor();
  const remove = useDeleteAdminAuthor();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    bio: '',
    avatarPath: null as string | null,
  });
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { isDirty, reset } = useDirtyTracker(form);
  useUnsavedGuard(isDirty);

  useEffect(() => {
    if (!existing) return;
    setForm({
      name: existing.name,
      slug: existing.slug,
      bio: existing.bio ?? '',
      avatarPath: existing.avatar_path,
    });
  }, [existing]);

  useEffect(() => {
    if (!authorId || existing) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId, existing]);

  const resolvedSlug = form.slug.trim() || slugify(form.name);
  const avatarUrl = adminCoverUrl(form.avatarPath);

  const handleAvatar = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    const sizeError = validateCoverSize(asset.fileSize);
    if (sizeError) {
      toast.error(sizeError);
      return;
    }

    setUploading(true);
    try {
      const path = await uploadAdminAvatar(
        asset.uri,
        resolvedSlug || 'author',
        asset.type ?? 'image/jpeg',
      );
      setForm(current => ({ ...current, avatarPath: path }));
      toast.success('Portrait uploaded.');
    } catch (caught) {
      toast.error(errorMessage(caught, 'Could not upload the portrait.'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Enter the author name.');
      return;
    }

    save.mutate(
      {
        id: authorId,
        name: form.name,
        slug: resolvedSlug,
        bio: form.bio,
        avatar_path: form.avatarPath,
      },
      {
        onSuccess: () => {
          reset();
          toast.success(authorId ? 'Author saved.' : 'Author created.');
          navigation.goBack();
        },
        onError: caught => toast.error(errorMessage(caught)),
      },
    );
  };

  return (
    <Screen>
      <AdminBackLink label="Authors" />
      <ScreenHeader
        title={authorId ? 'Edit author' : 'New author'}
        subtitle={existing ? `${existing.book_count} books credited` : 'Add a name to the catalog.'}
      />

      <View style={s.stack}>
        <AdminCard title="Portrait">
          <View style={s.row}>
            <View style={[s.avatar, { backgroundColor: colors.primaryFillSoft }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.avatarImage} />
              ) : (
                <User size={26} color={colors.muted} strokeWidth={1.8} />
              )}
            </View>
            <View style={s.grow}>
              <AdminButton
                label={uploading ? 'Uploading…' : avatarUrl ? 'Replace' : 'Upload'}
                Icon={ImageUp}
                variant="secondary"
                compact
                disabled={uploading}
                onPress={() => {
                  void handleAvatar();
                }}
              />
              <AdminHelper>Optional. Square images look best.</AdminHelper>
            </View>
          </View>
        </AdminCard>

        <AdminField
          label="Name"
          value={form.name}
          onChangeText={value => setForm(current => ({ ...current, name: value }))}
          maxLength={120}
        />
        <AdminField
          label="Slug"
          value={form.slug}
          onChangeText={value => setForm(current => ({ ...current, slug: value }))}
          placeholder={slugify(form.name) || 'auto-from-name'}
          autoCapitalize="none"
          helper={`Currently “${resolvedSlug || '—'}”.`}
        />
        <AdminField
          label="Biography"
          value={form.bio}
          onChangeText={value => setForm(current => ({ ...current, bio: value }))}
          multiline
        />

        <AdminButton
          label={save.isPending ? 'Saving…' : authorId ? 'Save changes' : 'Create author'}
          loading={save.isPending}
          disabled={uploading || !form.name.trim()}
          onPress={handleSave}
        />

        {authorId ? (
          <>
            <AdminButton
              label="Delete author"
              variant="destructive"
              disabled={remove.isPending}
              onPress={() => setConfirmDelete(true)}
            />
            {existing && existing.book_count > 0 ? (
              <Text size={12} leading={1.4} align="center" tone="muted">
                {existing.book_count} books are still credited to this author and must be reassigned
                first.
              </Text>
            ) : null}
          </>
        ) : null}
      </View>

      <AdminConfirmSheet
        visible={confirmDelete}
        title="Delete this author?"
        message="Authors with books cannot be deleted — reassign or remove those titles first."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          authorId &&
          remove.mutate(authorId, {
            onSuccess: () => {
              setConfirmDelete(false);
              reset();
              toast.success('Author deleted.');
              navigation.goBack();
            },
            onError: caught => {
              setConfirmDelete(false);
              toast.error(errorMessage(caught));
            },
          })
        }
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  stack: { gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  grow: { flex: 1, gap: 8 },
});
