import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { Plus, Trash2 } from 'lucide-react-native';

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
  AdminActionBar,
  AdminBackLink,
  AdminButton,
  AdminCard,
  AdminField,
  AdminHelper,
  AdminOutlineButton,
  AdminScreenTitle,
  AdminSectionHeader,
  AdminTag,
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
  useBookOptionsByIds,
  useCollectionBookIds,
  useDeleteAdminCollection,
  useSaveAdminCollection,
} from '@/hooks/useAdmin';
import {
  adminCoverUrl,
  BOOK_OPTIONS_LIMIT,
  slugify,
  systemShelfNote,
  type AdminBookOption,
} from '@/services/admin';
import { palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminLibraryStackParamList } from '../navigation/types';
import { useStrings } from '@/i18n';
import { strings } from '@/i18n/strings';

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
    badges.push({
      label: strings().adminLibrary.categoryBooks.draft,
      tone: 'warning',
    });
  }
  if (book.is_premium) {
    badges.push({
      label: strings().adminLibrary.categoryBooks.premium,
      tone: 'premium',
    });
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
 * re-slugged. Each stands in for itself when left empty — Trending with the
 * server's weekly draw, the other two with the newest published books.
 */
export function AdminCollectionEditorScreen() {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<AdminLibraryStackParamList, 'AdminCollectionEditor'>>();
  const collectionId = route.params?.collectionId;
  const { colors } = useTheme();
  const s = useStrings();
  const words = s.adminLibrary.collection;
  const { scrollEndPadding } = useAppInsets();
  const toast = useToast();

  const { data: collections = [] } = useAdminCollections();
  const { data: memberIds } = useCollectionBookIds(collectionId);
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
  // The picker's term goes to the server: the catalogue can be any size, the
  // picker shows one page of it. The shelf's own members are fetched by id
  // so every row on it has a title and a cover wherever it sits.
  const [pickerQuery, setPickerQuery] = useState('');
  const options = useBookOptions(pickerQuery);
  const members = useBookOptionsByIds(form.bookIds);

  const { isDirty, reset, dirtyRef } = useDirtyTracker(form);
  useUnsavedGuard(dirtyRef);

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
  const systemNote = isSystem ? systemShelfNote(existing?.slug ?? '') : null;
  const hasBookList = !isSystem || (systemNote?.curated ?? true);

  const resolvedSlug = form.slug.trim() || slugify(form.title);

  const books = useMemo(() => options.data ?? [], [options.data]);
  const bookById = useMemo(() => {
    const map = new Map<string, AdminBookOption>();
    for (const book of options.data ?? []) map.set(book.id, book);
    for (const book of members.data ?? []) map.set(book.id, book);
    return map;
  }, [members.data, options.data]);

  const orderedItems = useMemo(
    () =>
      form.bookIds.map(id => {
        const book = bookById.get(id);
        return {
          id,
          label: book?.title ?? words.unknownTitle,
          sublabel: book?.author_name,
          coverUrl: adminCoverUrl(book?.cover_path),
          coverColor: book?.cover_color ?? null,
          badges: bookBadges(book),
        };
      }),
    [form.bookIds, bookById, words],
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
    const visibility = form.isPublished
      ? words.liveOnHome
      : words.hiddenFromHome;
    if (systemNote && !hasBookList) {
      return `${systemNote.label} · ${visibility}`;
    }
    if (form.bookIds.length === 0) {
      return systemNote
        ? words.nothingCurated(systemNote.label, systemNote.standIn)
        : words.emptyNotShown;
    }
    const count = s.adminLibrary.counts.books(form.bookIds.length);
    const live =
      liveCount === form.bookIds.length
        ? ''
        : ` · ${s.adminLibrary.counts.live(liveCount)}`;
    return `${count}${live} · ${visibility}`;
  })();

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error(words.enterTitle);
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
          toast.success(collectionId ? words.saved : words.created);
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
          label={words.collections}
          action={
            isDirty ? (
              <AdminTag label={s.admin.ui.unsaved} tone="warning" />
            ) : isSystem ? (
              <AdminTag label={words.homeRail} tone="neutral" />
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
            form.title ||
            (collectionId ? words.editCollection : words.newCollection)
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
            label={words.title}
            value={form.title}
            onChangeText={value =>
              setForm(current => ({ ...current, title: value }))
            }
            maxLength={80}
          />
          <AdminField
            label={words.subtitle}
            value={form.subtitle}
            onChangeText={value =>
              setForm(current => ({ ...current, subtitle: value }))
            }
            placeholder={words.subtitlePlaceholder}
            maxLength={120}
            helper={words.subtitleHint}
          />

          {isSystem ? (
            <AdminField
              label={words.urlKey}
              value={existing?.slug ?? ''}
              onChangeText={() => undefined}
              editable={false}
              autoCapitalize="none"
              mono
              helper={words.fixed}
            />
          ) : (
            <AdminField
              label={words.urlKey}
              value={form.slug}
              onChangeText={value =>
                setForm(current => ({ ...current, slug: value }))
              }
              placeholder={slugify(form.title) || words.autoFromTitle}
              autoCapitalize="none"
              mono
              helper={words.currently(resolvedSlug || '—')}
            />
          )}

          <AdminColorField
            label={words.accent}
            value={form.accent}
            onChange={value =>
              setForm(current => ({ ...current, accent: value }))
            }
            helper={words.accentHint}
          />

          <AdminCard>
            <AdminToggleRow
              label={words.showOnHome}
              description={isSystem ? words.hiddenRail : words.hiddenCollection}
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
              title={words.booksInOrder}
              action={
                <AdminOutlineButton
                  label={words.addBooks}
                  Icon={Plus}
                  small
                  fullWidth={false}
                  onPress={() => setShowPicker(true)}
                />
              }
            />
            <AdminOrderableList
              items={orderedItems}
              emptyLabel={
                systemNote
                  ? words.nothingCuratedEmpty(systemNote.standIn)
                  : words.noBooksEmpty
              }
              onChange={next =>
                setForm(current => ({
                  ...current,
                  bookIds: next.map(i => i.id),
                }))
              }
            />
            <AdminHelper>{words.orderHint}</AdminHelper>
          </View>
        ) : null}

        {collectionId && !isSystem ? (
          <View style={styles.deleteBlock}>
            <AdminOutlineButton
              label={words.deleteCollection}
              Icon={Trash2}
              destructive
              onPress={() => setConfirmDelete(true)}
            />
            <Text size={11.5} leading={1.4} align="center" tone="faint">
              {words.booksKept}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <AdminActionBar>
        <AdminButton
          label={collectionId ? words.saveCollection : words.createCollection}
          loading={save.isPending}
          disabled={!form.title.trim()}
          onPress={handleSave}
        />
      </AdminActionBar>

      <AdminPickerSheet
        visible={showPicker}
        title={words.booksOn}
        multi
        items={pickerItems}
        selected={form.bookIds}
        emptyLabel={s.adminLibrary.categoryBooks.noBooksInCatalog}
        onSearch={setPickerQuery}
        searching={options.isFetching}
        footnote={
          books.length >= BOOK_OPTIONS_LIMIT
            ? s.adminLibrary.categoryBooks.showingFirst(BOOK_OPTIONS_LIMIT)
            : undefined
        }
        onClose={() => setShowPicker(false)}
        onChange={next => setForm(current => ({ ...current, bookIds: next }))}
      />

      <AdminConfirmSheet
        visible={confirmDelete}
        title={words.deleteTitle(form.title || words.thisCollection)}
        message={words.deleteMessage}
        consequences={[
          words.cardOnHome,
          words.handMadeOrder(form.bookIds.length),
        ]}
        confirmLabel={s.admin.ui.delete}
        destructive
        footnote={words.hidingKeeps}
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          collectionId &&
          remove.mutate(collectionId, {
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
  stack: { gap: 13 },
  block: { gap: 9 },
  deleteBlock: {
    gap: 8,
    paddingTop: 4,
  },
});
