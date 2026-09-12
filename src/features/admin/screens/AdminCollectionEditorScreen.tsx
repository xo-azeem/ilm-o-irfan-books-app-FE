import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';

import { Text } from '@/components/ui';
import {
  AdminColorField,
  AdminConfirmSheet,
  AdminPickerSheet,
  AdminSegmented,
} from '@/features/admin/components/AdminControls';
import { AdminOrderableList } from '@/features/admin/components/AdminOrderableList';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminBackLink,
  AdminButton,
  AdminCard,
  AdminField,
  AdminHelper,
  AdminScreenTitle,
  AdminSectionHeader,
  AdminTag,
  AdminTextAction,
  AdminToggleRow,
} from '@/features/admin/components/AdminUi';
import {
  useDirtyTracker,
  useUnsavedGuard,
} from '@/features/admin/hooks/useAdminForm';
import { useAppInsets } from '@/hooks/useAppInsets';
import {
  useAdminCollections,
  useBookOptions,
  useCollectionBookIds,
  useDeleteAdminCollection,
  useSaveAdminCollection,
} from '@/hooks/useAdmin';
import {
  COLLECTION_KINDS,
  slugify,
  type AdminCollectionKind,
} from '@/services/admin';
import { palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminLibraryStackParamList } from '../navigation/types';

const KIND_OPTIONS = COLLECTION_KINDS.map(kind => ({
  value: kind,
  label: kind.charAt(0).toUpperCase() + kind.slice(1),
}));

const KIND_HELP: Record<AdminCollectionKind, string> = {
  hero: 'The full-width carousel at the top of Home. Keep it to a handful of titles.',
  shelf: 'A horizontal cover row inside Home and Explore.',
  carousel: 'A card row for themed reading lists.',
};

/**
 * A shelf.
 *
 * The order of the books inside it is the order readers scroll through, so it
 * is edited here as a list rather than as a number, and an empty shelf says
 * plainly that it will not be rendered at all.
 */
export function AdminCollectionEditorScreen() {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<AdminLibraryStackParamList, 'AdminCollectionEditor'>>();
  const collectionId = route.params?.collectionId;
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
  const toast = useToast();

  const { data: collections = [] } = useAdminCollections();
  const { data: memberIds } = useCollectionBookIds(collectionId);
  const { data: books = [] } = useBookOptions('');
  const existing = collections.find(item => item.id === collectionId);

  const save = useSaveAdminCollection();
  const remove = useDeleteAdminCollection();

  const [form, setForm] = useState({
    title: '',
    slug: '',
    subtitle: '',
    accent: palette.green as string,
    kind: 'shelf' as AdminCollectionKind,
    isPublished: true,
    bookIds: [] as string[],
  });
  const [showPicker, setShowPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { isDirty, reset } = useDirtyTracker(form);
  useUnsavedGuard(isDirty);

  useEffect(() => {
    if (!existing) return;
    setForm(current => ({
      ...current,
      title: existing.title,
      slug: existing.slug,
      subtitle: existing.subtitle ?? '',
      accent: existing.accent ?? palette.green,
      kind: existing.kind,
      isPublished: existing.is_published,
    }));
  }, [existing]);

  useEffect(() => {
    if (memberIds) {
      setForm(current => ({ ...current, bookIds: memberIds }));
    }
  }, [memberIds]);

  useEffect(() => {
    if (!collectionId || (existing && memberIds)) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, existing, memberIds]);

  const resolvedSlug = form.slug.trim() || slugify(form.title);

  const orderedItems = useMemo(
    () =>
      form.bookIds.map(id => {
        const book = books.find(item => item.id === id);
        return {
          id,
          label: book?.title ?? 'Unknown title',
          sublabel: book?.author_name,
        };
      }),
    [form.bookIds, books],
  );

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error('Enter a shelf title.');
      return;
    }

    save.mutate(
      {
        id: collectionId,
        title: form.title,
        slug: resolvedSlug,
        subtitle: form.subtitle,
        accent: form.accent,
        kind: form.kind,
        // Position on Home is set on the shelf list, where the whole running
        // order is visible.
        sort_order: existing?.sort_order ?? collections.length,
        is_published: form.isPublished,
        book_ids: form.bookIds,
      },
      {
        onSuccess: () => {
          reset();
          toast.success(collectionId ? 'Shelf saved.' : 'Shelf created.');
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
          label="Shelves"
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
          title={form.title || (collectionId ? 'Edit shelf' : 'New shelf')}
          subtitle={
            form.bookIds.length === 0
              ? 'Empty shelves are not rendered on Home.'
              : `${form.bookIds.length} ${form.bookIds.length === 1 ? 'book' : 'books'} · ${
                  form.isPublished ? 'live on Home' : 'hidden from Home'
                }`
          }
        />

        <View style={styles.stack}>
          <AdminField
            label="Title"
            value={form.title}
            onChangeText={value =>
              setForm(current => ({ ...current, title: value }))
            }
            maxLength={80}
          />
          <AdminField
            label="Subtitle"
            value={form.subtitle}
            onChangeText={value =>
              setForm(current => ({ ...current, subtitle: value }))
            }
            placeholder="Hand-picked reading lists"
            maxLength={120}
          />

          <View style={styles.block}>
            <AdminSectionHeader title="Shape" />
            <AdminSegmented
              options={KIND_OPTIONS}
              value={form.kind}
              onChange={kind => setForm(current => ({ ...current, kind }))}
            />
            <AdminHelper>{KIND_HELP[form.kind]}</AdminHelper>
          </View>

          <AdminField
            label="URL key"
            value={form.slug}
            onChangeText={value =>
              setForm(current => ({ ...current, slug: value }))
            }
            placeholder={slugify(form.title) || 'auto-from-title'}
            autoCapitalize="none"
            mono
            helper={`Currently “${resolvedSlug || '—'}”.`}
          />

          <AdminColorField
            label="Accent"
            value={form.accent}
            onChange={value =>
              setForm(current => ({ ...current, accent: value }))
            }
            helper="Tints the row header on Home."
          />

          <AdminCard>
            <AdminToggleRow
              label="Show on Home"
              description="A hidden shelf stays linkable but disappears from Home."
              value={form.isPublished}
              onValueChange={value =>
                setForm(current => ({ ...current, isPublished: value }))
              }
            />
          </AdminCard>
        </View>

        <View style={styles.block}>
          <AdminSectionHeader
            title="Books, in order"
            action={
              <AdminTextAction
                label="Add books"
                size={11.5}
                onPress={() => setShowPicker(true)}
              />
            }
          />
          <AdminOrderableList
            items={orderedItems}
            emptyLabel="No books yet — an empty shelf is not rendered on Home."
            onChange={next =>
              setForm(current => ({ ...current, bookIds: next.map(i => i.id) }))
            }
          />
          <AdminHelper>
            Top to bottom here is left to right on Home.
          </AdminHelper>
        </View>

        {collectionId ? (
          <View style={styles.deleteBlock}>
            <AdminTextAction
              label="Delete this shelf"
              destructive
              size={13}
              onPress={() => setConfirmDelete(true)}
            />
            <Text size={11.5} leading={1.4} align="center" tone="faint">
              The books themselves are kept.
            </Text>
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
          label={collectionId ? 'Save shelf' : 'Create shelf'}
          loading={save.isPending}
          disabled={!form.title.trim()}
          onPress={handleSave}
        />
      </View>

      <AdminPickerSheet
        visible={showPicker}
        title="Books on this shelf"
        multi
        items={books.map(book => ({
          id: book.id,
          label: book.title,
          sublabel: book.author_name,
          accent: book.cover_color,
        }))}
        selected={form.bookIds}
        emptyLabel="No books in the catalog yet."
        onClose={() => setShowPicker(false)}
        onChange={next => setForm(current => ({ ...current, bookIds: next }))}
      />

      <AdminConfirmSheet
        visible={confirmDelete}
        title={`Delete ${form.title || 'this shelf'}?`}
        message="The books themselves are kept. What goes:"
        consequences={[
          'This row on Home',
          `The hand-made order of ${form.bookIds.length} ${
            form.bookIds.length === 1 ? 'title' : 'titles'
          }`,
        ]}
        confirmLabel="Delete"
        destructive
        footnote="Hiding it keeps the shelf and its order."
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          collectionId &&
          remove.mutate(collectionId, {
            onSuccess: () => {
              setConfirmDelete(false);
              reset();
              toast.success('Shelf deleted.');
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
  stack: { gap: 13 },
  block: { gap: 9 },
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
