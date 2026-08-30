import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';
import { Copy, Eye, FileText, ImageUp, Trash2 } from 'lucide-react-native';

import { BookCoverPlaceholder } from '@/components/books';
import { DisplayText, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import {
  AdminColorField,
  AdminConfirmSheet,
  AdminPickerSheet,
  AdminSegmented,
  AdminTagInput,
} from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminChip,
  AdminField,
  AdminHelper,
  AdminLabel,
  AdminToggleRow,
  DANGER,
  WARNING,
} from '@/features/admin/components/AdminUi';
import {
  useDebouncedValue,
  useDirtyTracker,
  useUnsavedGuard,
} from '@/features/admin/hooks/useAdminForm';
import { formatBytes } from '@/features/admin/utils/format';
import { useAppInsets } from '@/hooks/useAppInsets';
import {
  useAdminAuthors,
  useAdminBook,
  useAdminCategories,
  useAdminCollections,
  useDeleteAdminBooks,
  useDuplicateAdminBook,
  useSaveAdminBook,
} from '@/hooks/useAdmin';
import {
  adminCoverUrl,
  isSlugAvailable,
  slugify,
  uploadAdminCover,
  uploadAdminPdf,
  validateCoverSize,
  validatePdfSize,
  type AdminBookInput,
} from '@/services/admin';
import { palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminBooksStackParamList } from '../navigation/types';

type Tab = 'details' | 'files' | 'placement';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'details', label: 'Details' },
  { value: 'files', label: 'Files' },
  { value: 'placement', label: 'Placement' },
];

const CURRENCIES = ['PKR', 'USD', 'GBP', 'EUR', 'SAR', 'AED'];

type FormState = {
  title: string;
  slug: string;
  description: string;
  authorId: string;
  genre: string;
  tag: string;
  tags: string[];
  coverColor: string;
  coverColorDark: string;
  coverPath: string | null;
  pdfPath: string | null;
  fileSizeBytes: number | null;
  readTime: string;
  price: string;
  currency: string;
  format: string;
  isPremium: boolean;
  isPublished: boolean;
  categoryIds: string[];
  collectionIds: string[];
};

const EMPTY: FormState = {
  title: '',
  slug: '',
  description: '',
  authorId: '',
  genre: '',
  tag: '',
  tags: [],
  coverColor: palette.green,
  coverColorDark: palette.green,
  coverPath: null,
  pdfPath: null,
  fileSizeBytes: null,
  readTime: '',
  price: '0',
  currency: 'PKR',
  format: 'Digital edition',
  isPremium: true,
  isPublished: false,
  categoryIds: [],
  collectionIds: [],
};

export function AdminBookEditorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminBooksStackParamList>>();
  const route = useRoute<RouteProp<AdminBooksStackParamList, 'AdminBookEditor'>>();
  const bookId = route.params?.bookId;
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
  const toast = useToast();

  const { data: existing, isLoading } = useAdminBook(bookId);
  const { data: authors = [] } = useAdminAuthors();
  const { data: categories = [] } = useAdminCategories();
  const { data: collections = [] } = useAdminCollections();

  const saveBook = useSaveAdminBook();
  const duplicateBook = useDuplicateAdminBook();
  const deleteBooks = useDeleteAdminBooks();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [tab, setTab] = useState<Tab>('details');
  const [coverProgress, setCoverProgress] = useState<number | null>(null);
  const [pdfProgress, setPdfProgress] = useState<number | null>(null);
  const [slugTaken, setSlugTaken] = useState(false);
  const [showAuthorPicker, setShowAuthorPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [touched, setTouched] = useState(false);

  const { isDirty, reset } = useDirtyTracker(form);
  useUnsavedGuard(isDirty);

  const patch = (next: Partial<FormState>) => {
    setForm(current => ({ ...current, ...next }));
  };

  useEffect(() => {
    if (!existing) {
      return;
    }
    setForm({
      title: existing.title,
      slug: existing.slug,
      description: existing.description,
      authorId: existing.author_id,
      genre: existing.genre ?? '',
      tag: existing.tag ?? '',
      tags: existing.tags,
      coverColor: existing.cover_color ?? palette.green,
      coverColorDark: existing.cover_color_dark ?? existing.cover_color ?? palette.green,
      coverPath: existing.cover_path,
      pdfPath: existing.pdf_path,
      fileSizeBytes: existing.file_size_bytes,
      readTime: existing.read_time_minutes ? String(existing.read_time_minutes) : '',
      price: String((existing.price_cents ?? 0) / 100),
      currency: existing.currency,
      format: existing.format,
      isPremium: existing.is_premium,
      isPublished: existing.is_published,
      categoryIds: existing.category_ids,
      collectionIds: existing.collection_ids,
    });
  }, [existing]);

  // Snapshot once the loaded record has landed so the guard starts clean.
  useEffect(() => {
    if (!bookId || existing) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, existing]);

  const resolvedSlug = useMemo(
    () => form.slug.trim() || slugify(form.title),
    [form.slug, form.title],
  );
  const debouncedSlug = useDebouncedValue(resolvedSlug, 450);

  useEffect(() => {
    let active = true;
    if (!debouncedSlug) {
      setSlugTaken(false);
      return;
    }
    void isSlugAvailable(debouncedSlug, bookId)
      .then(available => {
        if (active) setSlugTaken(!available);
      })
      .catch(() => {
        if (active) setSlugTaken(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSlug, bookId]);

  const author = authors.find(item => item.id === form.authorId);
  const uploading = coverProgress !== null || pdfProgress !== null;

  const errors = {
    title: !form.title.trim() ? 'A title is required.' : null,
    author: !form.authorId ? 'Choose an author.' : null,
    slug: slugTaken ? 'Another title already uses this slug.' : null,
    price: Number.isNaN(Number(form.price)) ? 'Enter a number.' : null,
    readTime:
      form.readTime && !Number.isFinite(Number(form.readTime)) ? 'Enter minutes as a number.' : null,
    publish:
      form.isPublished && !form.pdfPath ? 'Upload a PDF before publishing this title.' : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const handleCover = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    const sizeError = validateCoverSize(asset.fileSize);
    if (sizeError) {
      toast.error(sizeError);
      return;
    }

    setCoverProgress(0);
    try {
      const path = await uploadAdminCover(
        asset.uri,
        resolvedSlug || 'cover',
        asset.type ?? 'image/jpeg',
        setCoverProgress,
      );
      patch({ coverPath: path });
      toast.success('Cover uploaded.');
    } catch (caught) {
      toast.error(errorMessage(caught, 'Could not upload the cover.'));
    } finally {
      setCoverProgress(null);
    }
  };

  const handlePdf = async () => {
    try {
      const [file] = await pick({ type: [types.pdf], allowMultiSelection: false });

      const sizeError = validatePdfSize(file.size);
      if (sizeError) {
        toast.error(sizeError);
        return;
      }

      setPdfProgress(0);
      const [local] = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: file.name ?? `${resolvedSlug || 'book'}.pdf` }],
        destination: 'cachesDirectory',
      });
      if (local.status !== 'success') {
        throw new Error('Could not copy the selected PDF.');
      }

      const uploaded = await uploadAdminPdf(
        local.localUri,
        resolvedSlug || 'book',
        file.size,
        setPdfProgress,
      );
      patch({ pdfPath: uploaded.path, fileSizeBytes: uploaded.sizeBytes });
      toast.success('PDF uploaded.');
    } catch (caught) {
      if (isErrorWithCode(caught) && caught.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      toast.error(errorMessage(caught, 'Could not upload the PDF.'));
    } finally {
      setPdfProgress(null);
    }
  };

  const buildInput = (): AdminBookInput => ({
    title: form.title,
    slug: resolvedSlug,
    description: form.description,
    author_id: form.authorId,
    genre: form.genre,
    tag: form.tag,
    tags: form.tags,
    cover_color: form.coverColor,
    cover_color_dark: form.coverColorDark,
    cover_path: form.coverPath,
    pdf_path: form.pdfPath,
    file_size_bytes: form.fileSizeBytes,
    read_time_minutes: form.readTime ? Math.round(Number(form.readTime)) : null,
    price_cents: Math.round((Number(form.price) || 0) * 100),
    currency: form.currency,
    format: form.format,
    is_premium: form.isPremium,
    is_published: form.isPublished,
    category_ids: form.categoryIds,
    collection_ids: form.collectionIds,
  });

  const handleSave = () => {
    setTouched(true);
    if (hasErrors) {
      toast.error(
        errors.publish ?? errors.title ?? errors.author ?? errors.slug ?? 'Fix the highlighted fields.',
      );
      setTab(errors.publish ? 'files' : 'details');
      return;
    }

    saveBook.mutate(
      { id: bookId, input: buildInput() },
      {
        onSuccess: () => {
          reset();
          toast.success(bookId ? 'Book saved.' : 'Book created.');
          navigation.goBack();
        },
        onError: caught => toast.error(errorMessage(caught)),
      },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-app-bg dark:bg-app-bg-dark" edges={['top', 'left', 'right']}>
      <View className="px-5 pt-1">
        <AdminBackLink />
        <View className="mb-3 flex-row items-end justify-between gap-3">
          <View className="min-w-0 flex-1">
            <DisplayText
              className="text-[27px] font-bold leading-[33px] tracking-tight text-app-ink dark:text-app-ink-dark"
              numberOfLines={1}>
              {bookId ? form.title || 'Edit book' : 'New book'}
            </DisplayText>
            <View className="mt-1.5 flex-row items-center gap-2">
              <AdminBadge
                label={form.isPublished ? 'Published' : 'Draft'}
                tone={form.isPublished ? 'success' : 'neutral'}
              />
              {isDirty ? <AdminBadge label="Unsaved" tone="warning" /> : null}
            </View>
          </View>

          {bookId ? (
            <View className="flex-row gap-1">
              <IconAction
                Icon={Copy}
                label="Duplicate"
                onPress={() =>
                  duplicateBook.mutate(bookId, {
                    onSuccess: newId => {
                      toast.success('Draft copy created.');
                      navigation.replace(ADMIN_ROUTES.BOOK_EDITOR, { bookId: newId });
                    },
                    onError: caught => toast.error(errorMessage(caught)),
                  })
                }
              />
              <IconAction Icon={Trash2} label="Delete" tone="danger" onPress={() => setConfirmDelete(true)} />
            </View>
          ) : null}
        </View>

        <View className="mb-3">
          <AdminSegmented options={TABS} value={tab} onChange={setTab} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: scrollEndPadding + 70 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {isLoading && bookId ? (
          <Text className="py-10 text-center text-[14px] text-app-muted dark:text-app-muted-dark">
            Loading…
          </Text>
        ) : tab === 'details' ? (
          <View className="gap-4">
            <AdminField
              label="Title"
              value={form.title}
              onChangeText={value => patch({ title: value })}
              error={touched ? errors.title : null}
              maxLength={160}
            />
            <AdminField
              label="Slug"
              value={form.slug}
              onChangeText={value => patch({ slug: value })}
              placeholder={slugify(form.title) || 'auto-from-title'}
              autoCapitalize="none"
              error={errors.slug}
              helper={`Public URL key — currently “${resolvedSlug || '—'}”.`}
            />

            <Pressable
              onPress={() => setShowAuthorPicker(true)}
              className="gap-1.5 active:opacity-70">
              <AdminLabel>Author</AdminLabel>
              <View
                className="flex-row items-center justify-between rounded-[12px] border bg-app-surface px-4 dark:bg-app-surface-dark"
                style={{
                  height: 50,
                  borderColor: touched && errors.author ? DANGER : colors.border,
                }}>
                <Text
                  className="text-[16px]"
                  style={{ color: author ? colors.ink : colors.faint }}
                  numberOfLines={1}>
                  {author?.name ?? 'Choose an author'}
                </Text>
                <Text className="text-[13px] text-app-primary dark:text-app-primary-dark">
                  Change
                </Text>
              </View>
              {touched && errors.author ? (
                <Text className="px-1 text-[12px]" style={{ color: DANGER }}>
                  {errors.author}
                </Text>
              ) : null}
            </Pressable>

            <AdminField
              label="Description"
              value={form.description}
              onChangeText={value => patch({ description: value })}
              multiline
              helper="Shown on the book detail screen."
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <AdminField
                  label="Genre"
                  value={form.genre}
                  onChangeText={value => patch({ genre: value })}
                  placeholder="Islamic Studies"
                />
              </View>
              <View className="flex-1">
                <AdminField
                  label="Badge"
                  value={form.tag}
                  onChangeText={value => patch({ tag: value })}
                  placeholder="New"
                  helper="Corner label on the cover."
                />
              </View>
            </View>

            <AdminTagInput
              label="Search tags"
              tags={form.tags}
              onChange={tags => patch({ tags })}
              helper="Feed the catalog search index. Not shown to readers."
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <AdminField
                  label="Read time"
                  value={form.readTime}
                  onChangeText={value => patch({ readTime: value.replace(/[^0-9]/g, '') })}
                  keyboardType="number-pad"
                  suffix="min"
                  error={errors.readTime}
                />
              </View>
              <View className="flex-1">
                <AdminField
                  label="Format"
                  value={form.format}
                  onChangeText={value => patch({ format: value })}
                  placeholder="Digital edition"
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <AdminField
                  label="Price"
                  value={form.price}
                  onChangeText={value => patch({ price: value.replace(/[^0-9.]/g, '') })}
                  keyboardType="decimal-pad"
                  error={errors.price}
                  helper="0 for titles included in a subscription."
                />
              </View>
              <View className="w-[110px] gap-1.5">
                <AdminLabel>Currency</AdminLabel>
                <View className="flex-row flex-wrap gap-1.5">
                  {CURRENCIES.slice(0, 3).map(code => (
                    <AdminChip
                      key={code}
                      label={code}
                      compact
                      selected={form.currency === code}
                      onPress={() => patch({ currency: code })}
                    />
                  ))}
                </View>
              </View>
            </View>

            <AdminColorField
              label="Cover colour"
              value={form.coverColor}
              onChange={value => patch({ coverColor: value })}
              helper="Used behind the cover art and as a fallback."
            />
            <AdminColorField
              label="Cover colour (dark mode)"
              value={form.coverColorDark}
              onChange={value => patch({ coverColorDark: value })}
            />
          </View>
        ) : tab === 'files' ? (
          <View className="gap-5">
            <View className="items-center py-2">
              <BookCoverPlaceholder
                width={128}
                height={185}
                coverColor={form.coverColor}
                coverUrl={adminCoverUrl(form.coverPath)}
                borderRadius={14}
                tag={form.tag || undefined}
              />
            </View>

            <AdminCard title="Cover image">
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[14px] text-app-muted dark:text-app-muted-dark">
                    {form.coverPath ? 'Uploaded' : 'Not uploaded'}
                  </Text>
                  {form.coverPath ? <AdminBadge label="Ready" tone="success" /> : null}
                </View>
                {coverProgress !== null ? (
                  <ProgressBar value={coverProgress} label="Uploading cover" />
                ) : null}
                <AdminButton
                  label={form.coverPath ? 'Replace cover' : 'Upload cover'}
                  Icon={ImageUp}
                  variant="secondary"
                  disabled={uploading}
                  onPress={() => {
                    void handleCover();
                  }}
                />
                <AdminHelper>JPG, PNG, or WebP up to 5 MB. Portrait art works best.</AdminHelper>
              </View>
            </AdminCard>

            <AdminCard title="Book PDF">
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[14px] text-app-muted dark:text-app-muted-dark">
                    {form.pdfPath ? formatBytes(form.fileSizeBytes) : 'Not uploaded'}
                  </Text>
                  {form.pdfPath ? (
                    <AdminBadge label="Ready" tone="success" />
                  ) : (
                    <AdminBadge label="Required to publish" tone="warning" />
                  )}
                </View>
                {pdfProgress !== null ? (
                  <ProgressBar value={pdfProgress} label="Uploading PDF" />
                ) : null}
                <AdminButton
                  label={form.pdfPath ? 'Replace PDF' : 'Upload PDF'}
                  Icon={FileText}
                  variant="secondary"
                  disabled={uploading}
                  onPress={() => {
                    void handlePdf();
                  }}
                />
                {bookId && form.pdfPath ? (
                  <AdminButton
                    label="Preview PDF"
                    Icon={Eye}
                    variant="secondary"
                    onPress={() =>
                      navigation.navigate(ADMIN_ROUTES.PDF_PREVIEW, {
                        bookId,
                        title: form.title || 'Preview',
                      })
                    }
                  />
                ) : null}
                <AdminHelper>
                  Up to 100 MB. Stored privately — readers only get short-lived signed links.
                </AdminHelper>
              </View>
            </AdminCard>
          </View>
        ) : (
          <View className="gap-5">
            <AdminCard title="Visibility">
              <View className="gap-3">
                <AdminToggleRow
                  label="Published"
                  description="Live in Home, Search, and Explore."
                  value={form.isPublished}
                  onValueChange={value => patch({ isPublished: value })}
                />
                {errors.publish ? (
                  <View
                    className="rounded-[10px] px-3 py-2"
                    style={{ backgroundColor: `${WARNING}1A` }}>
                    <Text className="text-[12px]" style={{ color: WARNING }}>
                      {errors.publish}
                    </Text>
                  </View>
                ) : null}
                <View className="h-px bg-app-border dark:bg-app-border-dark" />
                <AdminToggleRow
                  label="Premium"
                  description="Shows the premium badge. The paywall itself is controlled in System → Settings."
                  value={form.isPremium}
                  onValueChange={value => patch({ isPremium: value })}
                />
              </View>
            </AdminCard>

            <AdminCard
              title="Categories"
              action={
                <Pressable onPress={() => setShowCategoryPicker(true)} hitSlop={8}>
                  <Text className="text-[13px] font-semibold text-app-primary dark:text-app-primary-dark">
                    Edit
                  </Text>
                </Pressable>
              }>
              {form.categoryIds.length === 0 ? (
                <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
                  Not in any category yet.
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {form.categoryIds.map(id => {
                    const category = categories.find(item => item.id === id);
                    return (
                      <AdminChip
                        key={id}
                        label={category?.label ?? 'Unknown'}
                        accent={category?.accent}
                        selected
                        compact
                        onPress={() =>
                          patch({ categoryIds: form.categoryIds.filter(item => item !== id) })
                        }
                      />
                    );
                  })}
                </View>
              )}
            </AdminCard>

            <AdminCard
              title="Collections"
              action={
                <Pressable onPress={() => setShowCollectionPicker(true)} hitSlop={8}>
                  <Text className="text-[13px] font-semibold text-app-primary dark:text-app-primary-dark">
                    Edit
                  </Text>
                </Pressable>
              }>
              {form.collectionIds.length === 0 ? (
                <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
                  Not featured in any shelf.
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {form.collectionIds.map(id => {
                    const collection = collections.find(item => item.id === id);
                    return (
                      <AdminChip
                        key={id}
                        label={collection?.title ?? 'Unknown'}
                        selected
                        compact
                        onPress={() =>
                          patch({ collectionIds: form.collectionIds.filter(item => item !== id) })
                        }
                      />
                    );
                  })}
                </View>
              )}
            </AdminCard>

            {existing ? (
              <AdminCard title="Engagement">
                <View className="flex-row justify-between">
                  <Metric label="Readers" value={existing.reader_count} />
                  <Metric label="Downloads" value={existing.download_count} />
                  <Metric label="Wishlisted" value={existing.wishlist_count} />
                  <Metric label="Rating" value={existing.rating.toFixed(1)} />
                </View>
              </AdminCard>
            ) : null}
          </View>
        )}
      </ScrollView>

      <View
        className="border-t px-5 pb-6 pt-3"
        style={{ backgroundColor: colors.chrome, borderColor: colors.border }}>
        <AdminButton
          label={saveBook.isPending ? 'Saving…' : bookId ? 'Save changes' : 'Create book'}
          loading={saveBook.isPending}
          disabled={uploading || (touched && hasErrors)}
          onPress={handleSave}
        />
      </View>

      <AdminPickerSheet
        visible={showAuthorPicker}
        title="Author"
        items={authors.map(item => ({
          id: item.id,
          label: item.name,
          sublabel: `${item.book_count} ${item.book_count === 1 ? 'book' : 'books'}`,
        }))}
        selected={form.authorId ? [form.authorId] : []}
        emptyLabel="No authors yet. Add one under Catalog → Authors."
        onClose={() => setShowAuthorPicker(false)}
        onChange={next => patch({ authorId: next[0] ?? '' })}
      />

      <AdminPickerSheet
        visible={showCategoryPicker}
        title="Categories"
        multi
        items={categories.map(item => ({
          id: item.id,
          label: item.label,
          sublabel: `${item.book_count} ${item.book_count === 1 ? 'book' : 'books'}`,
          accent: item.accent,
        }))}
        selected={form.categoryIds}
        emptyLabel="No categories yet. Add one under Catalog → Categories."
        onClose={() => setShowCategoryPicker(false)}
        onChange={next => patch({ categoryIds: next })}
      />

      <AdminPickerSheet
        visible={showCollectionPicker}
        title="Collections"
        multi
        items={collections.map(item => ({
          id: item.id,
          label: item.title,
          sublabel: `${item.kind} · ${item.book_count} books`,
        }))}
        selected={form.collectionIds}
        emptyLabel="No collections yet. Add one under Catalog → Collections."
        onClose={() => setShowCollectionPicker(false)}
        onChange={next => patch({ collectionIds: next })}
      />

      <AdminConfirmSheet
        visible={confirmDelete}
        title="Delete this book?"
        message="Reading progress, wishlist entries, downloads, and the uploaded cover and PDF are removed too. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteBooks.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          bookId &&
          deleteBooks.mutate([bookId], {
            onSuccess: () => {
              setConfirmDelete(false);
              reset();
              toast.success('Book deleted.');
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

function ProgressBar({ value, label }: { value: number; label: string }) {
  const { colors } = useTheme();
  return (
    <View className="gap-1.5">
      <View className="flex-row justify-between">
        <Text className="text-[12px] text-app-muted dark:text-app-muted-dark">{label}</Text>
        <Text className="text-[12px] font-medium text-app-ink dark:text-app-ink-dark">
          {Math.round(value * 100)}%
        </Text>
      </View>
      <View className="h-[6px] overflow-hidden rounded-full" style={{ backgroundColor: colors.fill }}>
        <View
          className="h-full rounded-full"
          style={{ width: `${Math.max(value * 100, 3)}%`, backgroundColor: colors.primary }}
        />
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <View className="items-center gap-0.5">
      <DisplayText className="text-[19px] font-bold text-app-ink dark:text-app-ink-dark">
        {value}
      </DisplayText>
      <Text className="text-[11px] text-app-muted dark:text-app-muted-dark">{label}</Text>
    </View>
  );
}

function IconAction({
  Icon,
  label,
  onPress,
  tone,
}: {
  Icon: typeof Copy;
  label: string;
  onPress: () => void;
  tone?: 'danger';
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={6}
      className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
      style={{ backgroundColor: colors.fill }}>
      <Icon size={17} color={tone === 'danger' ? DANGER : colors.ink} strokeWidth={2.1} />
    </Pressable>
  );
}
