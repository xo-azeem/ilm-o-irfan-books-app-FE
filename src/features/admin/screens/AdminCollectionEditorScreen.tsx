import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import {
  AdminColorField,
  AdminConfirmSheet,
  AdminPickerSheet,
  AdminSegmented,
} from '@/features/admin/components/AdminControls';
import { AdminOrderableList } from '@/features/admin/components/AdminOrderableList';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminButton,
  AdminCard,
  AdminField,
  AdminHelper,
  AdminToggleRow,
} from '@/features/admin/components/AdminUi';
import { useDirtyTracker, useUnsavedGuard } from '@/features/admin/hooks/useAdminForm';
import {
  useAdminCollections,
  useBookOptions,
  useCollectionBookIds,
  useDeleteAdminCollection,
  useSaveAdminCollection,
} from '@/hooks/useAdmin';
import { COLLECTION_KINDS, slugify, type AdminCollectionKind } from '@/services/admin';
import { palette } from '@/theme/palette';

import type { AdminCatalogStackParamList } from '../navigation/types';

const KIND_OPTIONS = COLLECTION_KINDS.map(kind => ({
  value: kind,
  label: kind.charAt(0).toUpperCase() + kind.slice(1),
}));

const KIND_HELP: Record<AdminCollectionKind, string> = {
  hero: 'Full-width carousel at the top of Home. Keep it to a handful of titles.',
  shelf: 'Horizontal cover row inside Home and Explore.',
  carousel: 'Card row used for themed reading lists.',
};

export function AdminCollectionEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AdminCatalogStackParamList, 'AdminCollectionEditor'>>();
  const collectionId = route.params?.collectionId;
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
    sortOrder: '0',
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
      sortOrder: String(existing.sort_order),
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
        return { id, label: book?.title ?? 'Unknown title', sublabel: book?.author_name };
      }),
    [form.bookIds, books],
  );

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error('Enter a collection title.');
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
        sort_order: Number(form.sortOrder) || 0,
        is_published: form.isPublished,
        book_ids: form.bookIds,
      },
      {
        onSuccess: () => {
          reset();
          toast.success(collectionId ? 'Collection saved.' : 'Collection created.');
          navigation.goBack();
        },
        onError: caught => toast.error(errorMessage(caught)),
      },
    );
  };

  return (
    <Screen>
      <AdminBackLink label="Collections" />
      <ScreenHeader
        title={collectionId ? 'Edit collection' : 'New collection'}
        subtitle={`${form.bookIds.length} ${form.bookIds.length === 1 ? 'book' : 'books'} in this shelf`}
      />

      <View className="gap-4">
        <AdminField
          label="Title"
          value={form.title}
          onChangeText={value => setForm(current => ({ ...current, title: value }))}
          maxLength={80}
        />
        <AdminField
          label="Subtitle"
          value={form.subtitle}
          onChangeText={value => setForm(current => ({ ...current, subtitle: value }))}
          placeholder="Hand-picked reading lists"
        />
        <AdminField
          label="Slug"
          value={form.slug}
          onChangeText={value => setForm(current => ({ ...current, slug: value }))}
          placeholder={slugify(form.title) || 'auto-from-title'}
          autoCapitalize="none"
          helper={`Currently “${resolvedSlug || '—'}”.`}
        />

        <View className="gap-2">
          <AdminSegmented
            options={KIND_OPTIONS}
            value={form.kind}
            onChange={kind => setForm(current => ({ ...current, kind }))}
          />
          <AdminHelper>{KIND_HELP[form.kind]}</AdminHelper>
        </View>

        <AdminColorField
          label="Accent"
          value={form.accent}
          onChange={value => setForm(current => ({ ...current, accent: value }))}
        />

        <AdminCard>
          <AdminToggleRow
            label="Published"
            description="Hidden collections stay out of the reader app entirely."
            value={form.isPublished}
            onValueChange={value => setForm(current => ({ ...current, isPublished: value }))}
          />
        </AdminCard>

        <AdminField
          label="Sort order"
          value={form.sortOrder}
          onChangeText={value =>
            setForm(current => ({ ...current, sortOrder: value.replace(/[^0-9]/g, '') }))
          }
          keyboardType="number-pad"
        />

        <AdminCard
          title="Books in order"
          padded={false}
          action={
            <AdminButton
              label="Add books"
              Icon={Plus}
              variant="secondary"
              compact
              onPress={() => setShowPicker(true)}
            />
          }>
          <View className="p-3">
            <AdminOrderableList
              items={orderedItems}
              emptyLabel="No books yet — an empty collection is not rendered."
              onChange={next => setForm(current => ({ ...current, bookIds: next.map(i => i.id) }))}
            />
          </View>
        </AdminCard>

        <AdminButton
          label={save.isPending ? 'Saving…' : collectionId ? 'Save changes' : 'Create collection'}
          loading={save.isPending}
          disabled={!form.title.trim()}
          onPress={handleSave}
        />

        {collectionId ? (
          <AdminButton
            label="Delete collection"
            variant="destructive"
            disabled={remove.isPending}
            onPress={() => setConfirmDelete(true)}
          />
        ) : null}
      </View>

      <AdminPickerSheet
        visible={showPicker}
        title="Books in this collection"
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
        title="Delete this collection?"
        message="The books themselves are not deleted — only this shelf and its ordering."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          collectionId &&
          remove.mutate(collectionId, {
            onSuccess: () => {
              setConfirmDelete(false);
              reset();
              toast.success('Collection deleted.');
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
