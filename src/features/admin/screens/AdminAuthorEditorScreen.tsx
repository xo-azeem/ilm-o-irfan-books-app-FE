import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { ImageUp, Library, Trash2 } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminConfirmSheet } from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminActionBar,
  AdminAvatar,
  AdminBackLink,
  AdminButton,
  AdminField,
  AdminNavRow,
  AdminRowGroup,
  AdminScreenTitle,
  AdminTag,
  AdminOutlineButton,
} from '@/features/admin/components/AdminUi';
import {
  useDirtyTracker,
  useUnsavedGuard,
} from '@/features/admin/hooks/useAdminForm';
import { useStorageCleanup } from '@/features/admin/hooks/useStorageCleanup';
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
import { useStrings } from '@/i18n';

/**
 * An author.
 *
 * Small screen, one rule: an author credited on books cannot be deleted, and
 * the delete action says so with the number rather than failing on tap.
 */
export function AdminAuthorEditorScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AdminLibraryStackParamList>>();
  const route =
    useRoute<RouteProp<AdminLibraryStackParamList, 'AdminAuthorEditor'>>();
  const authorId = route.params?.authorId;
  const { colors } = useTheme();
  const s = useStrings();
  const words = s.adminLibrary.author;
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

  const { isDirty, reset, dirtyRef } = useDirtyTracker(form);
  useUnsavedGuard(dirtyRef);
  // A portrait is uploaded the moment it is picked. Until the author is
  // saved it belongs to nobody, and it is removed if the screen is left
  // without saving — or replaced by a second pick.
  const uploads = useStorageCleanup();
  const savedAvatar = useRef<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    savedAvatar.current = existing.avatar_path;
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
      uploads.replacePending(form.avatarPath, path);
      setForm(current => ({ ...current, avatarPath: path }));
      toast.success(words.portraitUploaded);
    } catch (caught) {
      toast.error(errorMessage(caught, words.portraitFailed));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error(words.enterName);
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
          // The new portrait is the author's now; the one it replaced is
          // nobody's, unless another record still points at it.
          uploads.commit([form.avatarPath], [savedAvatar.current]);
          savedAvatar.current = form.avatarPath;
          reset();
          toast.success(authorId ? words.saved : words.created);
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
          label={words.authors}
          action={
            isDirty ? (
              <AdminTag label={s.admin.ui.unsaved} tone="warning" />
            ) : undefined
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
          title={authorId ? form.name || words.editAuthor : words.newAuthor}
          subtitle={
            existing
              ? words.credited(
                  s.adminLibrary.counts.books(credited),
                  existing.published_count,
                )
              : words.nameToBrowse
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
              {words.portrait}
            </Text>
            <Text size={12} leading={1.5} tone="muted">
              {words.portraitHint}
            </Text>
            <AdminButton
              label={
                uploading
                  ? words.uploading
                  : avatarUrl
                    ? words.replaceImage
                    : words.chooseImage
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

        {/* The author's titles live on the Books segment, one filter away.
            Only once the author exists — a new one has nothing yet. */}
        {authorId && existing ? (
          <AdminRowGroup title={words.books}>
            <AdminNavRow
              Icon={Library}
              label={words.booksByAuthor}
              sublabel={
                credited === 0
                  ? words.nothingCredited
                  : words.titlesLive(
                      s.adminLibrary.counts.titles(credited),
                      existing.published_count,
                    )
              }
              warn={credited === 0}
              onPress={() =>
                navigation.navigate(ADMIN_ROUTES.LIBRARY_HOME, {
                  segment: 'books',
                  authorId,
                })
              }
            />
          </AdminRowGroup>
        ) : null}

        <View style={styles.stack}>
          <AdminField
            label={words.name}
            value={form.name}
            onChangeText={value =>
              setForm(current => ({ ...current, name: value }))
            }
            maxLength={120}
          />
          <AdminField
            label={words.publicLink}
            value={form.slug}
            onChangeText={value =>
              setForm(current => ({ ...current, slug: value }))
            }
            placeholder={slugify(form.name) || words.autoFromName}
            autoCapitalize="none"
            mono
            helper={words.madeFromName(resolvedSlug || '—')}
          />
          <AdminField
            label={words.biography}
            value={form.bio}
            onChangeText={value =>
              setForm(current => ({ ...current, bio: value }))
            }
            multiline
            maxLength={800}
            helper={words.biographyHint}
          />
        </View>

        {authorId ? (
          <View style={styles.deleteBlock}>
            <AdminOutlineButton
              label={words.deleteAuthor}
              Icon={Trash2}
              destructive
              disabled={credited > 0}
              onPress={() => setConfirmDelete(true)}
            />
            {credited > 0 ? (
              <Text size={11.5} leading={1.4} align="center" tone="faint">
                {words.stillCredited(credited)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <AdminActionBar>
        <AdminButton
          label={authorId ? words.saveAuthor : words.createAuthor}
          loading={save.isPending}
          disabled={uploading || !form.name.trim()}
          onPress={handleSave}
        />
      </AdminActionBar>

      <AdminConfirmSheet
        visible={confirmDelete}
        title={words.deleteTitle(form.name || words.thisAuthor)}
        message={words.deleteMessage}
        confirmLabel={s.admin.ui.delete}
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          authorId &&
          remove.mutate(authorId, {
            onSuccess: () => {
              setConfirmDelete(false);
              reset();
              toast.success(words.deleted);
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
    gap: 8,
    paddingTop: 4,
  },
});
