import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';
import { Copy, ImageUp, Trash2, type LucideIcon } from 'lucide-react-native';

import { BookCover, Display, Icon, Label, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import {
  AdminColorField,
  AdminConfirmSheet,
  AdminPickerSheet,
  AdminTagInput,
} from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminBackLink,
  AdminButton,
  AdminCard,
  AdminChecklist,
  AdminChip,
  AdminDivider,
  AdminEyebrow,
  AdminField,
  AdminHelper,
  AdminLabel,
  AdminPickerField,
  AdminSectionHeader,
  AdminTag,
  AdminTextAction,
  AdminToggleRow,
  AdminUploadProgress,
  type ChecklistItem,
} from '@/features/admin/components/AdminUi';
import {
  useDebouncedValue,
  useDirtyTracker,
  useUnsavedGuard,
} from '@/features/admin/hooks/useAdminForm';
import { formatBytes, formatDate } from '@/features/admin/utils/format';
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
import { coverColors as COVER_RAMP, palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminLibraryStackParamList } from '../navigation/types';

const CURRENCIES = ['PKR', 'USD', 'GBP', 'EUR'];
const DESCRIPTION_MAX = 600;

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

/**
 * The book editor.
 *
 * One scroll instead of three sub-tabs, headed by a live checklist. Everything
 * that stands between this title and readers is on screen from the first
 * keystroke, each blocker carrying the tap that clears it — you no longer
 * learn a PDF is missing by trying to publish and failing.
 */
export function AdminBookEditorScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AdminLibraryStackParamList>>();
  const route =
    useRoute<RouteProp<AdminLibraryStackParamList, 'AdminBookEditor'>>();
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
      coverColorDark:
        existing.cover_color_dark ?? existing.cover_color ?? palette.green,
      coverPath: existing.cover_path,
      pdfPath: existing.pdf_path,
      fileSizeBytes: existing.file_size_bytes,
      readTime: existing.read_time_minutes
        ? String(existing.read_time_minutes)
        : '',
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
    slug: slugTaken ? 'Another title already uses this link.' : null,
    price: Number.isNaN(Number(form.price)) ? 'Enter a number.' : null,
    readTime:
      form.readTime && !Number.isFinite(Number(form.readTime))
        ? 'Enter minutes as a number.'
        : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const handleCover = async () => {
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
      const [file] = await pick({
        type: [types.pdf],
        allowMultiSelection: false,
      });

      const sizeError = validatePdfSize(file.size);
      if (sizeError) {
        toast.error(sizeError);
        return;
      }

      setPdfProgress(0);
      const [local] = await keepLocalCopy({
        files: [
          {
            uri: file.uri,
            fileName: file.name ?? `${resolvedSlug || 'book'}.pdf`,
          },
        ],
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
      if (
        isErrorWithCode(caught) &&
        caught.code === errorCodes.OPERATION_CANCELED
      ) {
        return;
      }
      toast.error(errorMessage(caught, 'Could not upload the PDF.'));
    } finally {
      setPdfProgress(null);
    }
  };

  const buildInput = (isPublished: boolean): AdminBookInput => ({
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
    is_published: isPublished,
    category_ids: form.categoryIds,
    collection_ids: form.collectionIds,
  });

  const save = (isPublished: boolean, successMessage: string) => {
    setTouched(true);
    if (hasErrors) {
      toast.error(
        errors.title ??
          errors.author ??
          errors.slug ??
          'Fix the highlighted fields.',
      );
      return;
    }

    saveBook.mutate(
      { id: bookId, input: buildInput(isPublished) },
      {
        onSuccess: () => {
          patch({ isPublished });
          reset();
          toast.success(successMessage);
          navigation.goBack();
        },
        onError: caught => toast.error(errorMessage(caught)),
      },
    );
  };

  // Everything standing between this title and readers, in the order it is
  // usually filled in.
  const checklist: ChecklistItem[] = [
    {
      id: 'identity',
      label: 'Title and author',
      done: Boolean(form.title.trim() && form.authorId),
      actionLabel: 'Add',
      onAction: () => setShowAuthorPicker(true),
    },
    {
      id: 'description',
      label: 'Description',
      done: form.description.trim().length > 0,
    },
    {
      id: 'category',
      label: 'At least one category',
      done: form.categoryIds.length > 0,
      actionLabel: 'Choose',
      onAction: () => setShowCategoryPicker(true),
    },
    {
      id: 'pdf',
      label: 'Book PDF',
      done: Boolean(form.pdfPath),
      actionLabel: 'Upload',
      onAction: () => {
        void handlePdf();
      },
    },
    {
      id: 'cover',
      label: 'Cover image',
      done: Boolean(form.coverPath),
      optional: true,
      actionLabel: 'Add',
      onAction: () => {
        void handleCover();
      },
    },
  ];

  const publishBlocker = !form.pdfPath
    ? 'needs a PDF'
    : hasErrors
      ? 'fix the fields above'
      : null;
  const pdfName = form.pdfPath ? form.pdfPath.split('/').pop() : null;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink
          label="Library"
          action={
            <View style={styles.stateBadges}>
              {isDirty ? <AdminTag label="UNSAVED" tone="warning" /> : null}
              <AdminTag
                label={form.isPublished ? 'LIVE' : 'DRAFT'}
                tone={form.isPublished ? 'success' : 'neutral'}
              />
            </View>
          }
        />

        <View style={styles.titleRow}>
          <Display
            size={24}
            weight="500"
            tracking={-0.4}
            numberOfLines={2}
            style={styles.grow}
          >
            {bookId ? form.title || 'Edit book' : 'New book'}
          </Display>

          {bookId ? (
            <View style={styles.titleActions}>
              <IconAction
                icon={Copy}
                label="Duplicate"
                onPress={() =>
                  duplicateBook.mutate(bookId, {
                    onSuccess: newId => {
                      toast.success('Draft copy created.');
                      navigation.replace(ADMIN_ROUTES.BOOK_EDITOR, {
                        bookId: newId,
                      });
                    },
                    onError: caught => toast.error(errorMessage(caught)),
                  })
                }
              />
              <IconAction
                icon={Trash2}
                label="Delete"
                tone="danger"
                onPress={() => setConfirmDelete(true)}
              />
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.grow}
        contentContainerStyle={{
          paddingHorizontal: ADMIN_GUTTER,
          paddingTop: 14,
          paddingBottom: scrollEndPadding + 80,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isLoading && bookId ? (
          <Text
            size={14}
            leading={1.5}
            align="center"
            tone="muted"
            style={styles.loading}
          >
            Loading…
          </Text>
        ) : (
          <>
            <AdminChecklist
              title={
                form.isPublished
                  ? 'This title is live'
                  : 'Before this can go live'
              }
              items={checklist}
            />

            {/* Identity */}
            <View style={styles.stack}>
              <AdminField
                label="Title"
                value={form.title}
                onChangeText={value => patch({ title: value })}
                error={touched ? errors.title : null}
                maxLength={160}
              />

              <AdminPickerField
                label="Author"
                value={author?.name}
                placeholder="Choose an author"
                onPress={() => setShowAuthorPicker(true)}
                error={touched ? errors.author : null}
              />

              <AdminField
                label="Description"
                value={form.description}
                onChangeText={value => patch({ description: value })}
                multiline
                maxLength={DESCRIPTION_MAX}
                helper="Shown on the book detail screen. Two or three sentences reads best."
              />

              <AdminPickerField
                label="Public link"
                value={resolvedSlug || null}
                placeholder="auto-from-title"
                mono
                verified={Boolean(resolvedSlug) && !slugTaken}
                actionLabel="Edit"
                onPress={() => patch({ slug: form.slug || resolvedSlug })}
                error={errors.slug}
                helper={
                  slugTaken ? undefined : 'Made from the title. Available.'
                }
                helperTone="faint"
              />

              {/* Only offered once the operator has asked to change it. */}
              {form.slug ? (
                <AdminField
                  label="Link override"
                  value={form.slug}
                  onChangeText={value => patch({ slug: value })}
                  autoCapitalize="none"
                  mono
                  error={errors.slug}
                  helper="Changing a published link breaks anything already pointing at it."
                  helperTone="warning"
                />
              ) : null}
            </View>

            {/* Files */}
            <View style={styles.section}>
              <Display size={22} weight="500" tracking={-0.4}>
                Files
              </Display>

              <View style={styles.coverBlock}>
                {form.coverPath ? (
                  <BookCover
                    width={104}
                    height={150}
                    rounded={12}
                    coverColor={form.coverColor}
                    coverUrl={adminCoverUrl(form.coverPath)}
                  />
                ) : (
                  <BookCover
                    width={104}
                    height={150}
                    rounded={12}
                    placeholder
                    placeholderLabel={'cover art\n1400×2100'}
                  />
                )}

                <View style={styles.coverBody}>
                  <Text size={14} leading={1.3} weight="500">
                    Cover image
                  </Text>
                  <Text size={12} leading={1.5} tone="muted">
                    JPG, PNG or WebP up to 5 MB. Portrait art works best —
                    readers see it at 2:3.
                  </Text>

                  {coverProgress !== null ? (
                    <AdminUploadProgress
                      fileName="Uploading cover"
                      percent={coverProgress * 100}
                    />
                  ) : (
                    <AdminButton
                      label={form.coverPath ? 'Replace image' : 'Choose image'}
                      Icon={ImageUp}
                      variant="secondary"
                      compact
                      disabled={uploading}
                      onPress={() => {
                        void handleCover();
                      }}
                    />
                  )}

                  <AdminEyebrow tone="faint">Or pick a colour</AdminEyebrow>
                  <View style={styles.swatches}>
                    {Object.values(COVER_RAMP).map(entry => {
                      const picked =
                        form.coverColor.toLowerCase() ===
                        entry.light.toLowerCase();
                      return (
                        <Pressable
                          key={entry.light}
                          accessibilityRole="button"
                          accessibilityState={{ selected: picked }}
                          accessibilityLabel={`Cover colour ${entry.light}`}
                          onPress={() =>
                            patch({
                              coverColor: entry.light,
                              coverColorDark: entry.dark,
                            })
                          }
                          style={[
                            styles.swatchRing,
                            picked && { borderColor: colors.actionInk },
                          ]}
                        >
                          <View
                            style={[
                              styles.swatch,
                              { backgroundColor: entry.light },
                            ]}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              <AdminCard>
                <View style={styles.between}>
                  <Text size={14} leading={1.3} weight="500">
                    Book PDF
                  </Text>
                  {pdfProgress !== null ? (
                    <AdminTag label="UPLOADING" tone="warning" />
                  ) : form.pdfPath ? (
                    <AdminTag label="READY" tone="success" />
                  ) : (
                    <AdminTag label="REQUIRED" tone="warning" />
                  )}
                </View>

                {pdfProgress !== null ? (
                  <AdminUploadProgress
                    fileName={`${resolvedSlug || 'book'}.pdf`}
                    percent={pdfProgress * 100}
                    detail="Stored privately while it uploads."
                  />
                ) : (
                  <AdminButton
                    label={form.pdfPath ? 'Replace PDF' : 'Choose a PDF'}
                    variant="secondary"
                    compact
                    disabled={uploading}
                    onPress={() => {
                      void handlePdf();
                    }}
                  />
                )}

                <AdminDivider />

                <AdminHelper>
                  Up to 100 MB. Stored privately — readers only ever get a
                  short-lived signed link, never the file itself.
                </AdminHelper>
              </AdminCard>

              {bookId && form.pdfPath ? (
                <AdminCard>
                  <Text size={14} leading={1.3} weight="500">
                    Currently live file
                  </Text>
                  <View style={styles.fileRow}>
                    <View
                      style={[
                        styles.fileChip,
                        { backgroundColor: colors.controlActive },
                      ]}
                    >
                      <Label
                        size={8}
                        leading={1}
                        weight="700"
                        tracking={0.4}
                        tone="action"
                      >
                        PDF
                      </Label>
                    </View>
                    <View style={styles.grow}>
                      <Label
                        size={12.5}
                        leading={1.2}
                        weight="400"
                        tracking={0}
                        uppercase={false}
                        tone="soft"
                        numberOfLines={1}
                      >
                        {pdfName ?? 'book.pdf'}
                      </Label>
                      <Text
                        size={11}
                        leading={1.2}
                        tone="faint"
                        numberOfLines={1}
                      >
                        {`${formatBytes(form.fileSizeBytes)} · added ${formatDate(
                          existing?.updated_at,
                        )}`}
                      </Text>
                    </View>
                    <AdminTextAction
                      label="Preview"
                      onPress={() =>
                        navigation.navigate(ADMIN_ROUTES.PDF_PREVIEW, {
                          bookId,
                          title: form.title || 'Preview',
                        })
                      }
                    />
                  </View>
                </AdminCard>
              ) : null}
            </View>

            {/* Placement */}
            <View style={styles.section}>
              <Display size={22} weight="500" tracking={-0.4}>
                Placement
              </Display>

              <View style={styles.stack}>
                <View style={styles.block}>
                  <AdminSectionHeader
                    title="Categories"
                    action={
                      <AdminTextAction
                        label="Edit"
                        size={11.5}
                        onPress={() => setShowCategoryPicker(true)}
                      />
                    }
                  />
                  {form.categoryIds.length === 0 ? (
                    <AdminHelper tone="warning">
                      Not in any category yet — readers will not find it on
                      Explore.
                    </AdminHelper>
                  ) : (
                    <View style={styles.wrap}>
                      {form.categoryIds.map(id => (
                        <AdminChip
                          key={id}
                          label={
                            categories.find(item => item.id === id)?.label ??
                            'Unknown'
                          }
                          selected
                          compact
                          onPress={() =>
                            patch({
                              categoryIds: form.categoryIds.filter(
                                item => item !== id,
                              ),
                            })
                          }
                        />
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.block}>
                  <AdminSectionHeader
                    title="Shelves"
                    action={
                      <AdminTextAction
                        label="Edit"
                        size={11.5}
                        onPress={() => setShowCollectionPicker(true)}
                      />
                    }
                  />
                  {form.collectionIds.length === 0 ? (
                    <AdminHelper>Not featured on any Home row.</AdminHelper>
                  ) : (
                    <View style={styles.wrap}>
                      {form.collectionIds.map(id => (
                        <AdminChip
                          key={id}
                          label={
                            collections.find(item => item.id === id)?.title ??
                            'Unknown'
                          }
                          selected
                          compact
                          onPress={() =>
                            patch({
                              collectionIds: form.collectionIds.filter(
                                item => item !== id,
                              ),
                            })
                          }
                        />
                      ))}
                    </View>
                  )}
                </View>

                <AdminCard>
                  <AdminToggleRow
                    label="Premium"
                    description="Only subscribers can open the PDF. Free titles open for everyone."
                    value={form.isPremium}
                    onValueChange={value => patch({ isPremium: value })}
                  />
                </AdminCard>
              </View>
            </View>

            {/* Details */}
            <View style={styles.section}>
              <Display size={22} weight="500" tracking={-0.4}>
                Details
              </Display>

              <View style={styles.stack}>
                <View style={styles.row}>
                  <View style={styles.grow}>
                    <AdminField
                      label="Genre"
                      value={form.genre}
                      onChangeText={value => patch({ genre: value })}
                      placeholder="Islamic Studies"
                    />
                  </View>
                  <View style={styles.grow}>
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
                  placeholder="Add a tag and press return"
                  helper="Feeds the catalog search index. Not shown to readers."
                />

                <View style={styles.row}>
                  <View style={styles.grow}>
                    <AdminField
                      label="Read time"
                      value={form.readTime}
                      onChangeText={value =>
                        patch({ readTime: value.replace(/[^0-9]/g, '') })
                      }
                      keyboardType="number-pad"
                      suffix="min"
                      error={errors.readTime}
                    />
                  </View>
                  <View style={styles.grow}>
                    <AdminField
                      label="Format"
                      value={form.format}
                      onChangeText={value => patch({ format: value })}
                      placeholder="Digital edition"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.grow}>
                    <AdminField
                      label="Price"
                      value={form.price}
                      onChangeText={value =>
                        patch({ price: value.replace(/[^0-9.]/g, '') })
                      }
                      keyboardType="decimal-pad"
                      error={errors.price}
                      helper="0 for titles included in a subscription."
                    />
                  </View>
                  <View style={styles.currency}>
                    <AdminLabel>Currency</AdminLabel>
                    <View style={styles.wrap}>
                      {CURRENCIES.map(code => (
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
            </View>

            {existing ? (
              <AdminCard title="How it is doing">
                <View style={styles.metrics}>
                  <Metric label="Readers" value={existing.reader_count} />
                  <Metric label="Downloads" value={existing.download_count} />
                  <Metric label="Wishlisted" value={existing.wishlist_count} />
                  <Metric label="Rating" value={existing.rating.toFixed(1)} />
                </View>
              </AdminCard>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* The two ways out of this screen, and why one of them is closed. */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.chrome,
            borderTopColor: colors.chromeBorder,
          },
        ]}
      >
        {form.isPublished ? (
          <>
            <View style={styles.grow}>
              <AdminButton
                label="Unpublish"
                variant="secondary"
                disabled={uploading || saveBook.isPending}
                onPress={() => save(false, 'Title unpublished.')}
              />
            </View>
            <View style={styles.grow}>
              <AdminButton
                label="Save changes"
                loading={saveBook.isPending}
                disabled={uploading}
                onPress={() => save(true, 'Book saved.')}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.grow}>
              <AdminButton
                label="Save draft"
                variant="secondary"
                loading={saveBook.isPending}
                disabled={uploading}
                onPress={() =>
                  save(false, bookId ? 'Draft saved.' : 'Draft created.')
                }
              />
            </View>
            <View style={styles.grow}>
              <AdminButton
                label="Publish"
                blockedReason={publishBlocker}
                disabled={uploading}
                onPress={() => save(true, 'Title published.')}
              />
            </View>
          </>
        )}
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
        emptyLabel="No authors yet. Add one from Library → Authors."
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
        emptyLabel="No categories yet. Add one from Library → Categories."
        onClose={() => setShowCategoryPicker(false)}
        onChange={next => patch({ categoryIds: next })}
      />

      <AdminPickerSheet
        visible={showCollectionPicker}
        title="Shelves"
        multi
        items={collections.map(item => ({
          id: item.id,
          label: item.title,
          sublabel: `${item.kind} · ${item.book_count} books`,
        }))}
        selected={form.collectionIds}
        emptyLabel="No shelves yet. Add one from Library → Shelves."
        onClose={() => setShowCollectionPicker(false)}
        onChange={next => patch({ collectionIds: next })}
      />

      <AdminConfirmSheet
        visible={confirmDelete}
        title={`Delete ${form.title || 'this book'}?`}
        message="This cannot be undone. Deleting the book also removes:"
        consequences={[
          `${existing?.reader_count ?? 0} readers' progress and bookmarks`,
          `${existing?.download_count ?? 0} downloads on readers' devices`,
          `The uploaded PDF and cover (${formatBytes(form.fileSizeBytes)})`,
          `Its place in ${form.collectionIds.length} ${
            form.collectionIds.length === 1 ? 'shelf' : 'shelves'
          }`,
        ]}
        confirmPhrase={form.isPublished ? form.title : null}
        confirmLabel="Delete"
        destructive
        footnote="Unpublishing hides it from readers and keeps everything."
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

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.metric}>
      <Text size={19} leading={1} weight="700">
        {String(value)}
      </Text>
      <Text size={11} leading={1.2} tone="muted">
        {label}
      </Text>
    </View>
  );
}

function IconAction({
  icon,
  label,
  onPress,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  tone?: 'danger';
}) {
  const { colors } = useTheme();
  const danger = tone === 'danger';

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconAction,
        {
          backgroundColor: danger ? colors.dangerFill : colors.primaryFillSoft,
        },
        pressed && styles.pressed,
      ]}
    >
      <Icon
        icon={icon}
        size={14}
        tone={danger ? 'danger' : 'action'}
        strokeWidth={1.9}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 11,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  stateBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconAction: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    paddingVertical: 40,
  },
  section: {
    gap: 16,
  },
  stack: {
    gap: 13,
  },
  block: {
    gap: 9,
  },
  row: {
    flexDirection: 'row',
    gap: 11,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  currency: {
    width: 130,
    gap: 8,
  },
  coverBlock: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  coverBody: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  swatches: {
    flexDirection: 'row',
    gap: 7,
  },
  swatchRing: {
    padding: 2,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 9,
  },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  fileChip: {
    width: 34,
    height: 42,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
    gap: 3,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 13,
    paddingBottom: 26,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.72,
  },
});
