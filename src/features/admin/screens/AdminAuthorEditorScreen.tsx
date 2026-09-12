import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { ImageUp } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { AdminConfirmSheet } from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminAvatar,
  AdminBackLink,
  AdminButton,
  AdminField,
  AdminHelper,
  AdminScreenTitle,
  AdminTag,
  AdminTextAction,
} from '@/features/admin/components/AdminUi';
import {
  useDirtyTracker,
  useUnsavedGuard,
} from '@/features/admin/hooks/useAdminForm';
import { useAppInsets } from '@/hooks/useAppInsets';
import {
  useAdminAuthors,
  useDeleteAdminAuthor,
  useSaveAdminAuthor,
} from '@/hooks/useAdmin';
import {
  adminCoverUrl,
  slugify,
  uploadAdminAvatar,
  validateCoverSize,
} from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminLibraryStackParamList } from '../navigation/types';

/**
 * An author.
 *
 * Small screen, one rule: an author credited on books cannot be deleted, and
 * the delete action says so with the number rather than failing on tap.
 */
export function AdminAuthorEditorScreen() {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<AdminLibraryStackParamList, 'AdminAuthorEditor'>>();
  const authorId = route.params?.authorId;
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
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
  const credited = existing?.book_count ?? 0;

  const handleAvatar = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });
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
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink
          label="Authors"
          action={
            isDirty ? <AdminTag label="UNSAVED" tone="warning" /> : undefined
          }
        />
      </View>

      <ScrollView
        style={styles.grow}
        contentContainerStyle={{
          paddingHorizontal: ADMIN_GUTTER,
          paddingTop: 16,
          paddingBottom: scrollEndPadding + 80,
          gap: 17,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AdminScreenTitle
          title={authorId ? form.name || 'Edit author' : 'New author'}
          subtitle={
            existing
              ? `${credited} ${credited === 1 ? 'book' : 'books'} credited · ${
                  existing.published_count
                } live`
              : 'A name readers can browse by.'
          }
        />

        <View style={styles.portrait}>
          <AdminAvatar
            name={form.name || 'A'}
            imageUrl={avatarUrl}
            size={104}
            tone={form.name ? 'primary' : 'neutral'}
          />
          <View style={styles.portraitBody}>
            <Text size={14} leading={1.3} weight="500">
              Portrait
            </Text>
            <Text size={12} leading={1.5} tone="muted">
              Optional. A square image reads best — readers see it as a circle
              beside the name.
            </Text>
            <AdminButton
              label={
                uploading
                  ? 'Uploading…'
                  : avatarUrl
                    ? 'Replace image'
                    : 'Choose image'
              }
              Icon={ImageUp}
              variant="secondary"
              compact
              disabled={uploading}
              onPress={() => {
                void handleAvatar();
              }}
            />
          </View>
        </View>

        <View style={styles.stack}>
          <AdminField
            label="Name"
            value={form.name}
            onChangeText={value =>
              setForm(current => ({ ...current, name: value }))
            }
            maxLength={120}
          />
          <AdminField
            label="Public link"
            value={form.slug}
            onChangeText={value =>
              setForm(current => ({ ...current, slug: value }))
            }
            placeholder={slugify(form.name) || 'auto-from-name'}
            autoCapitalize="none"
            mono
            helper={`Made from the name — currently “${resolvedSlug || '—'}”.`}
          />
          <AdminField
            label="Biography"
            value={form.bio}
            onChangeText={value =>
              setForm(current => ({ ...current, bio: value }))
            }
            multiline
            maxLength={800}
            helper="Shown on the author's page in the reader app."
          />
        </View>

        {authorId ? (
          <View style={styles.deleteBlock}>
            <AdminTextAction
              label={
                credited > 0
                  ? `Delete — ${credited} ${credited === 1 ? 'book is' : 'books are'} still credited`
                  : 'Delete this author'
              }
              destructive
              size={13}
              disabled={credited > 0}
              onPress={() => setConfirmDelete(true)}
            />
            {credited > 0 ? (
              <AdminHelper>
                Reassign or remove those titles first, then this author can go.
              </AdminHelper>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.chrome,
            borderTopColor: colors.chromeBorder,
          },
        ]}
      >
        <AdminButton
          label={authorId ? 'Save author' : 'Create author'}
          loading={save.isPending}
          disabled={uploading || !form.name.trim()}
          onPress={handleSave}
        />
      </View>

      <AdminConfirmSheet
        visible={confirmDelete}
        title={`Delete ${form.name || 'this author'}?`}
        message="The name disappears from the catalog. Nothing else is touched."
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  grow: { flex: 1 },
  portrait: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  portraitBody: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  stack: { gap: 13 },
  deleteBlock: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  footer: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 13,
    paddingBottom: 26,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
