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
  type RowBadge,
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
  adminCoverUrl,
  slugify,
  SYSTEM_SHELF_NOTE,
  type AdminBookOption,
} from '@/services/admin';
import { palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminLibraryStackParamList } from '../navigation/types';

/**
 * The tags a book carries on a shelf row.
 *
 * A draft is the one that matters: it sits in the order the admin made but
 * readers never see it, so a shelf of drafts is an empty shelf on Home.
 */
function bookBadges(book: AdminBookOption | undefined): RowBadge[] {
  if (!book) {
    return [];
  }
  const badges: RowBadge[] = [];
  if (!book.is_published) {
    badges.push({ label: 'DRAFT', tone: 'warning' });
  }
  if (book.is_premium) {
    badges.push({ label: 'PREMIUM', tone: 'premium' });
  }
  return badges;
}

/**
 * A collection.
 *
 * On Home it is a card on the "Curated collections" strip; tapping it opens
 * every published book on it, in the order arranged here. The order is edited
 * as a list rather than as a number because it is the order readers scroll
 * through, and an empty shelf says plainly that it will not be rendered.
 *
 * The three system shelves — `home-hero`, `trending`, `new-arrivals` — are
 * Home's own rails. They can be retitled and hidden here, but not deleted or
 * re-slugged, and Trending has no book list at all: the server draws it.
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

  const isSystem = existing?.is_system ?? false;
  const systemNote = isSystem ? SYSTEM_SHELF_NOTE[existing?.slug ?? ''] : null;
  // Trending's membership is the server's weekly draw; anything picked here
  // would be written and then ignored, so the list is not offered at all.
  const hasBookList = !isSystem || (systemNote?.curated ?? true);

  const resolvedSlug = form.slug.trim() || slugify(form.title);

  const bookById = useMemo(
    () => new Map(books.map(book => [book.id, book])),
    [books],
  );

  const orderedItems = useMemo(
    () =>
      form.bookIds.map(id => {
        const book = bookById.get(id);
        return {
          id,
          label: book?.title ?? 'Unknown title',
          sublabel: book?.author_name,
          coverUrl: adminCoverUrl(book?.cover_path),
          coverColor: book?.cover_color ?? null,
          badges: bookBadges(book),
        };
      }),
    [form.bookIds, bookById],
  );

  const pickerItems = useMemo(
    () =>
      books.map(book => ({
        id: book.id,
        label: book.title,
        sublabel: book.author_name,
        coverUrl: adminCoverUrl(book.cover_path),
        coverColor: book.cover_color,
        badges: bookBadges(book),
      })),
    [books],
  );

  const liveCount = useMemo(
    () =>
      form.bookIds.filter(id => bookById.get(id)?.is_published ?? true).length,
    [form.bookIds, bookById],
  );

  const subtitle = (() => {
    if (systemNote && !hasBookList) {
      return `${systemNote.label} · ${form.isPublished ? 'live on Home' : 'hidden from Home'}`;
    }
    if (form.bookIds.length === 0) {
      return systemNote
        ? `${systemNote.label} · nothing curated, the newest books stand in`
        : 'Empty collections are not shown on Home.';
    }
    const count = `${form.bookIds.length} ${form.bookIds.length === 1 ? 'book' : 'books'}`;
    const live =
      liveCount === form.bookIds.length ? '' : ` · ${liveCount} live`;
    return `${count}${live} · ${form.isPublished ? 'live on Home' : 'hidden from Home'}`;
  })();

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error('Enter a collection title.');
      return;
    }

    save.mutate(
      {
        id: collectionId,
        title: form.title,
        // A system shelf's slug is its contract with Home; the server refuses
        // to change it, so it is never sent changed.
        slug: isSystem ? (existing?.slug ?? resolvedSlug) : resolvedSlug,
        subtitle: form.subtitle,
        accent: form.accent,
        // `kind` is not something readers see any more: every collection is
        // a card on the strip. Existing rows keep whatever they have.
        kind: existing?.kind ?? 'shelf',
        // Position on Home is set on the collection list, where the whole
        // running order is visible.
        sort_order: existing?.sort_order ?? collections.length,
        is_published: form.isPublished,
        book_ids: hasBookList ? form.bookIds : (memberIds ?? []),
      },
      {
        onSuccess: () => {
          reset();
          toast.success(
            collectionId ? 'Collection saved.' : 'Collection created.',
          );
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
          label="Collections"
          action={
            isDirty ? (
              <AdminTag label="UNSAVED" tone="warning" />
            ) : isSystem ? (
              <AdminTag label="HOME RAIL" tone="neutral" />
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
          title={
            form.title || (collectionId ? 'Edit collection' : 'New collection')
          }
          subtitle={subtitle}
        />

        {systemNote ? (
          <AdminCard>
            <Text size={12.5} leading={1.5} tone="muted">
              {systemNote.note}
            </Text>
          </AdminCard>
        ) : null}

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
            helper="Shown on the card. Left blank, the card shows the book count."
          />

          {isSystem ? (
            <AdminField
              label="URL key"
              value={existing?.slug ?? ''}
              onChangeText={() => undefined}
              editable={false}
              autoCapitalize="none"
              mono
              helper="Fixed — Home finds this rail by it."
            />
          ) : (
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
          )}

          <AdminColorField
            label="Accent"
            value={form.accent}
            onChange={value =>
              setForm(current => ({ ...current, accent: value }))
            }
            helper="Tints the card on Home."
          />

          <AdminCard>
            <AdminToggleRow
              label="Show on Home"
              description={
                isSystem
                  ? 'Hidden, the rail comes off Home entirely.'
                  : 'A hidden collection stays linkable but disappears from Home.'
              }
              value={form.isPublished}
              onValueChange={value =>
                setForm(current => ({ ...current, isPublished: value }))
              }
            />
          </AdminCard>
        </View>

        {hasBookList ? (
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
              emptyLabel={
                systemNote
                  ? 'Nothing curated — the newest published books stand in.'
                  : 'No books yet — an empty collection is not shown on Home.'
              }
              onChange={next =>
                setForm(current => ({
                  ...current,
                  bookIds: next.map(i => i.id),
                }))
              }
            />
            <AdminHelper>
              Top to bottom here is the order readers see. Drafts stay in the
              order but are not shown until published.
            </AdminHelper>
          </View>
        ) : null}

        {collectionId && !isSystem ? (
          <View style={styles.deleteBlock}>
            <AdminTextAction
              label="Delete this collection"
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
          label={collectionId ? 'Save collection' : 'Create collection'}
          loading={save.isPending}
          disabled={!form.title.trim()}
          onPress={handleSave}
        />
      </View>

      <AdminPickerSheet
        visible={showPicker}
        title="Books on this collection"
        multi
        items={pickerItems}
        selected={form.bookIds}
        emptyLabel="No books in the catalog yet."
        onClose={() => setShowPicker(false)}
        onChange={next => setForm(current => ({ ...current, bookIds: next }))}
      />

      <AdminConfirmSheet
        visible={confirmDelete}
        title={`Delete ${form.title || 'this collection'}?`}
        message="The books themselves are kept. What goes:"
        consequences={[
          'Its card on Home',
          `The hand-made order of ${form.bookIds.length} ${
            form.bookIds.length === 1 ? 'title' : 'titles'
          }`,
        ]}
        confirmLabel="Delete"
        destructive
        footnote="Hiding it keeps the collection and its order."
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
