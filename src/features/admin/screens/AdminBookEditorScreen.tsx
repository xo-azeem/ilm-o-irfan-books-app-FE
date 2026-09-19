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
import {
  Copy,
  ImageUp,
  Layers,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';

import { BookCover, Display, Icon, Label, Tag, Text } from '@/components/ui';
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
  AdminActionBar,
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
  AdminNavRow,
  AdminPickerField,
  AdminRowGroup,
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
import { useStorageCleanup } from '@/features/admin/hooks/useStorageCleanup';
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
  systemShelfNote,
  uploadAdminCover,
  uploadAdminPdf,
  validateCoverSize,
  validatePdfSize,
  type AdminBookInput,
} from '@/services/admin';
import { coverColors as COVER_RAMP, palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminLibraryStackParamList } from '../navigation/types';
import { useStrings } from '@/i18n';

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
  /**
   * The bulk upload this book belongs to: the one it is being added to, or
   * the one it was added to before. In a batch the book is a draft until the
   * batch is published, so the editor's own Publish is put away and the way
   * out is "Add to batch".
   */
  const batchId = route.params?.batchId ?? null;
  const { colors } = useTheme();
  const s = useStrings();
  const words = s.adminLibrary.book;
  const counts = s.adminLibrary.counts;
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

  const { isDirty, reset, dirtyRef } = useDirtyTracker(form);
  useUnsavedGuard(dirtyRef);
  // Files go to Storage the moment they are picked. Until the book is saved
  // they belong to nobody, and they are removed if the screen is left
  // without saving — or superseded by a second pick before the save.
  const uploads = useStorageCleanup();

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
  const inBatch =
    !form.isPublished && Boolean(batchId ?? existing?.upload_batch_id);
  const batchToOpen = batchId ?? existing?.upload_batch_id ?? null;

  const errors = {
    title: !form.title.trim() ? words.titleRequired : null,
    author: !form.authorId ? words.chooseAuthor : null,
    slug: slugTaken ? words.slugTaken : null,
    price: Number.isNaN(Number(form.price)) ? words.enterNumber : null,
    readTime:
      form.readTime && !Number.isFinite(Number(form.readTime))
        ? words.enterMinutes
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
      uploads.replacePending(form.coverPath, path);
      patch({ coverPath: path });
      toast.success(words.coverUploaded);
    } catch (caught) {
      toast.error(errorMessage(caught, words.coverFailed));
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
        throw new Error(words.copyFailed);
      }

      const uploaded = await uploadAdminPdf(
        local.localUri,
        resolvedSlug || 'book',
        file.size,
        setPdfProgress,
      );
      uploads.replacePending(form.pdfPath, uploaded.path);
      patch({ pdfPath: uploaded.path, fileSizeBytes: uploaded.sizeBytes });
      toast.success(words.pdfUploaded);
    } catch (caught) {
      if (
        isErrorWithCode(caught) &&
        caught.code === errorCodes.OPERATION_CANCELED
      ) {
        return;
      }
      toast.error(errorMessage(caught, words.pdfFailed));
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
    // Only a new book is filed under a batch here; an existing one keeps
    // whatever batch it has, and leaves it only from the batch screen.
    ...(batchId && !bookId ? { upload_batch_id: batchId } : {}),
  });

  const save = (isPublished: boolean, successMessage: string) => {
    setTouched(true);
    if (hasErrors) {
      toast.error(
        errors.title ?? errors.author ?? errors.slug ?? words.fixFields,
      );
      return;
    }

    saveBook.mutate(
      { id: bookId, input: buildInput(isPublished) },
      {
        onSuccess: () => {
          // The files on the form are the book's now. Anything else uploaded
          // during this edit is nobody's; the files the record pointed at
          // before are offered to the guarded delete, which keeps any that
          // a duplicate still shares.
          uploads.commit(
            [form.coverPath, form.pdfPath],
            [existing?.cover_path, existing?.pdf_path],
          );
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
      label: words.checklist.identity,
      done: Boolean(form.title.trim() && form.authorId),
      actionLabel: words.checklist.add,
      onAction: () => setShowAuthorPicker(true),
    },
    {
      id: 'description',
      label: words.checklist.description,
      done: form.description.trim().length > 0,
    },
    {
      id: 'category',
      label: words.checklist.category,
      done: form.categoryIds.length > 0,
      actionLabel: words.checklist.choose,
      onAction: () => setShowCategoryPicker(true),
    },
    {
      id: 'pdf',
      label: words.checklist.pdf,
      done: Boolean(form.pdfPath),
      actionLabel: words.checklist.upload,
      onAction: () => {
        void handlePdf();
      },
    },
    {
      id: 'cover',
      label: words.checklist.cover,
      done: Boolean(form.coverPath),
      optional: true,
      actionLabel: words.checklist.add,
      onAction: () => {
        void handleCover();
      },
    },
  ];

  const publishBlocker = !form.pdfPath
    ? words.needsPdf
    : hasErrors
      ? words.fixAbove
      : null;
  const pdfName = form.pdfPath ? form.pdfPath.split('/').pop() : null;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink
          label={inBatch ? words.batch : words.library}
          action={
            <View style={styles.stateBadges}>
              {isDirty ? (
                <AdminTag label={s.admin.ui.unsaved} tone="warning" />
              ) : null}
              <AdminTag
                label={form.isPublished ? s.admin.ui.live : s.admin.ui.draft}
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
            {bookId ? form.title || words.editBook : words.newBook}
          </Display>

          {bookId ? (
            <View style={styles.titleActions}>
              <IconAction
                icon={Copy}
                label={words.duplicate}
                onPress={() =>
                  duplicateBook.mutate(bookId, {
                    onSuccess: newId => {
                      toast.success(words.draftCopyCreated);
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
                label={words.delete}
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
            {words.loading}
          </Text>
        ) : (
          <>
            <AdminChecklist
              title={
                form.isPublished
                  ? words.isLive
                  : inBatch
                    ? words.beforeBatchLive
                    : words.beforeLive
              }
              items={checklist}
            />

            {inBatch && batchToOpen ? (
              <AdminRowGroup>
                <AdminNavRow
                  Icon={Layers}
                  label={bookId ? words.partOfBatch : words.beingAdded}
                  sublabel={words.goesLiveWithBatch}
                  onPress={() =>
                    navigation.navigate(ADMIN_ROUTES.UPLOAD_BATCH, {
                      batchId: batchToOpen,
                    })
                  }
                />
              </AdminRowGroup>
            ) : null}

            {/* Identity */}
            <View style={styles.stack}>
              <AdminField
                label={words.title}
                value={form.title}
                onChangeText={value => patch({ title: value })}
                error={touched ? errors.title : null}
                maxLength={160}
              />

              <AdminPickerField
                label={words.author}
                value={author?.name}
                placeholder={words.chooseAnAuthor}
                onPress={() => setShowAuthorPicker(true)}
                error={touched ? errors.author : null}
              />

              <AdminField
                label={words.description}
                value={form.description}
                onChangeText={value => patch({ description: value })}
                multiline
                maxLength={DESCRIPTION_MAX}
                helper={words.descriptionHint}
              />

              <AdminPickerField
                label={words.publicLink}
                value={resolvedSlug || null}
                placeholder={words.autoFromTitle}
                mono
                verified={Boolean(resolvedSlug) && !slugTaken}
                actionLabel={words.edit}
                onPress={() => patch({ slug: form.slug || resolvedSlug })}
                error={errors.slug}
                helper={slugTaken ? undefined : words.madeFromTitle}
                helperTone="faint"
              />

              {/* Only offered once the operator has asked to change it. */}
              {form.slug ? (
                <AdminField
                  label={words.linkOverride}
                  value={form.slug}
                  onChangeText={value => patch({ slug: value })}
                  autoCapitalize="none"
                  mono
                  error={errors.slug}
                  helper={words.linkOverrideHint}
                  helperTone="warning"
                />
              ) : null}
            </View>

            {/* Files */}
            <View style={styles.section}>
              <Display size={22} weight="500" tracking={-0.4}>
                {words.files}
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
                    placeholderLabel={words.coverArtPlaceholder}
                  />
                )}

                <View style={styles.coverBody}>
                  <Text size={14} leading={1.3} weight="500">
                    {words.coverImage}
                  </Text>
                  <Text size={12} leading={1.5} tone="muted">
                    {words.coverHint}
                  </Text>

                  {coverProgress !== null ? (
                    <AdminUploadProgress
                      fileName={words.uploadingCover}
                      percent={coverProgress * 100}
                    />
                  ) : (
                    <AdminButton
                      label={
                        form.coverPath ? words.replaceImage : words.chooseImage
                      }
                      Icon={ImageUp}
                      variant="secondary"
                      compact
                      disabled={uploading}
                      onPress={() => {
                        void handleCover();
                      }}
                    />
                  )}

                  <AdminEyebrow tone="faint">{words.orPickColour}</AdminEyebrow>
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
                          accessibilityLabel={words.coverColourA11y(
                            entry.light,
                          )}
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
                    {words.bookPdf}
                  </Text>
                  {pdfProgress !== null ? (
                    <AdminTag label={words.uploading} tone="warning" />
                  ) : form.pdfPath ? (
                    <AdminTag label={words.ready} tone="success" />
                  ) : (
                    <AdminTag label={words.required} tone="warning" />
                  )}
                </View>

                {pdfProgress !== null ? (
                  <AdminUploadProgress
                    fileName={`${resolvedSlug || 'book'}.pdf`}
                    percent={pdfProgress * 100}
                    detail={words.storedPrivately}
                  />
                ) : (
                  <AdminButton
                    label={form.pdfPath ? words.replacePdf : words.choosePdf}
                    variant="secondary"
                    compact
                    disabled={uploading}
                    onPress={() => {
                      void handlePdf();
                    }}
                  />
                )}

                <AdminDivider />

                <AdminHelper>{words.pdfHint}</AdminHelper>

                {existing?.pdf_path && form.pdfPath !== existing.pdf_path ? (
                  <AdminHelper tone="warning">
                    {words.replaceWarning}
                  </AdminHelper>
                ) : null}
              </AdminCard>

              {bookId && form.pdfPath ? (
                <AdminCard>
                  <Text size={14} leading={1.3} weight="500">
                    {words.currentFile}
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
                        {words.addedOn(
                          formatBytes(form.fileSizeBytes),
                          formatDate(existing?.updated_at),
                        )}
                      </Text>
                    </View>
                    <AdminTextAction
                      label={words.preview}
                      onPress={() =>
                        navigation.navigate(ADMIN_ROUTES.PDF_PREVIEW, {
                          bookId,
                          title: form.title || words.preview,
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
                {words.placement}
              </Display>

              <View style={styles.stack}>
                {/* Membership reads as removable tags plus one dashed "add",
                    so joining a category is a visible tap, never a hunt for
                    a small "Edit" word. */}
                <View style={styles.block}>
                  <AdminSectionHeader
                    title={words.categories}
                    action={
                      <AdminTextAction
                        label={words.choose}
                        size={11.5}
                        onPress={() => setShowCategoryPicker(true)}
                      />
                    }
                  />
                  <View style={styles.wrap}>
                    {form.categoryIds.map(id => (
                      <Tag
                        key={id}
                        label={
                          categories.find(item => item.id === id)?.label ??
                          words.unknown
                        }
                        onRemove={() =>
                          patch({
                            categoryIds: form.categoryIds.filter(
                              item => item !== id,
                            ),
                          })
                        }
                      />
                    ))}
                    <Tag
                      label={
                        form.categoryIds.length
                          ? words.addAnother
                          : words.addToCategory
                      }
                      dashed
                      onPress={() => setShowCategoryPicker(true)}
                    />
                  </View>
                  {form.categoryIds.length === 0 ? (
                    <AdminHelper tone="warning">
                      {words.notInCategory}
                    </AdminHelper>
                  ) : (
                    <AdminHelper>
                      {words.shownUnder(form.categoryIds.length !== 1)}
                    </AdminHelper>
                  )}
                </View>

                <View style={styles.block}>
                  <AdminSectionHeader
                    title={words.collections}
                    action={
                      <AdminTextAction
                        label={words.choose}
                        size={11.5}
                        onPress={() => setShowCollectionPicker(true)}
                      />
                    }
                  />
                  <View style={styles.wrap}>
                    {form.collectionIds.map(id => (
                      <Tag
                        key={id}
                        label={
                          collections.find(item => item.id === id)?.title ??
                          words.unknown
                        }
                        onRemove={() =>
                          patch({
                            collectionIds: form.collectionIds.filter(
                              item => item !== id,
                            ),
                          })
                        }
                      />
                    ))}
                    <Tag
                      label={
                        form.collectionIds.length
                          ? words.addAnother
                          : words.addToCollection
                      }
                      dashed
                      onPress={() => setShowCollectionPicker(true)}
                    />
                  </View>
                  {form.collectionIds.length === 0 ? (
                    <AdminHelper>{words.notOnCollection}</AdminHelper>
                  ) : null}
                </View>

                <AdminCard>
                  <AdminToggleRow
                    label={words.premium}
                    description={words.premiumHint}
                    value={form.isPremium}
                    onValueChange={value => patch({ isPremium: value })}
                  />
                </AdminCard>
              </View>
            </View>

            {/* Details */}
            <View style={styles.section}>
              <Display size={22} weight="500" tracking={-0.4}>
                {words.details}
              </Display>

              <View style={styles.stack}>
                <View style={styles.row}>
                  <View style={styles.grow}>
                    <AdminField
                      label={words.genre}
                      value={form.genre}
                      onChangeText={value => patch({ genre: value })}
                      placeholder={words.genrePlaceholder}
                    />
                  </View>
                  <View style={styles.grow}>
                    <AdminField
                      label={words.badge}
                      value={form.tag}
                      onChangeText={value => patch({ tag: value })}
                      placeholder={words.badgePlaceholder}
                      helper={words.badgeHint}
                    />
                  </View>
                </View>

                <AdminTagInput
                  label={words.searchTags}
                  tags={form.tags}
                  onChange={tags => patch({ tags })}
                  placeholder={words.tagPlaceholder}
                  helper={words.tagsHint}
                />

                <View style={styles.row}>
                  <View style={styles.grow}>
                    <AdminField
                      label={words.readTime}
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
                      label={words.format}
                      value={form.format}
                      onChangeText={value => patch({ format: value })}
                      placeholder={words.formatPlaceholder}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.grow}>
                    <AdminField
                      label={words.price}
                      value={form.price}
                      onChangeText={value =>
                        patch({ price: value.replace(/[^0-9.]/g, '') })
                      }
                      keyboardType="decimal-pad"
                      error={errors.price}
                      helper={words.priceHint}
                    />
                  </View>
                  <View style={styles.currency}>
                    <AdminLabel>{words.currency}</AdminLabel>
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
                  label={words.coverColour}
                  value={form.coverColor}
                  onChange={value => patch({ coverColor: value })}
                  helper={words.coverColourHint}
                />
                <AdminColorField
                  label={words.coverColourDark}
                  value={form.coverColorDark}
                  onChange={value => patch({ coverColorDark: value })}
                />
              </View>
            </View>

            {existing ? (
              <AdminCard title={words.howItIsDoing}>
                <View style={styles.metrics}>
                  <Metric label={words.readers} value={existing.reader_count} />
                  <Metric
                    label={words.downloads}
                    value={existing.download_count}
                  />
                  <Metric
                    label={words.wishlisted}
                    value={existing.wishlist_count}
                  />
                  <Metric
                    label={words.rating}
                    value={existing.rating.toFixed(1)}
                  />
                </View>
              </AdminCard>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* The two ways out of this screen, and why one of them is closed. */}
      {form.isPublished ? (
        <AdminActionBar>
          <AdminButton
            label={words.unpublish}
            variant="secondary"
            disabled={uploading || saveBook.isPending}
            onPress={() => save(false, words.titleUnpublished)}
          />
          <AdminButton
            label={words.saveChanges}
            loading={saveBook.isPending}
            disabled={uploading}
            onPress={() => save(true, words.bookSaved)}
          />
        </AdminActionBar>
      ) : inBatch ? (
        // One way out: into the batch. Publishing is the batch's to do, so
        // there is no Publish here to put one title live ahead of the set.
        <AdminActionBar>
          <AdminButton
            label={bookId ? words.saveToBatch : words.addToBatch}
            Icon={Layers}
            loading={saveBook.isPending}
            disabled={uploading}
            onPress={() =>
              save(false, bookId ? words.savedToBatch : words.addedToBatch)
            }
          />
        </AdminActionBar>
      ) : (
        <AdminActionBar>
          <AdminButton
            label={words.saveDraft}
            variant="secondary"
            loading={saveBook.isPending}
            disabled={uploading}
            onPress={() =>
              save(false, bookId ? words.draftSaved : words.draftCreated)
            }
          />
          <AdminButton
            label={words.publish}
            blockedReason={publishBlocker}
            disabled={uploading}
            onPress={() => save(true, words.titlePublished)}
          />
        </AdminActionBar>
      )}

      <AdminPickerSheet
        visible={showAuthorPicker}
        title={words.author}
        items={authors.map(item => ({
          id: item.id,
          label: item.name,
          sublabel: counts.books(item.book_count),
        }))}
        selected={form.authorId ? [form.authorId] : []}
        emptyLabel={words.noAuthorsPicker}
        onClose={() => setShowAuthorPicker(false)}
        onChange={next => patch({ authorId: next[0] ?? '' })}
      />

      <AdminPickerSheet
        visible={showCategoryPicker}
        title={words.categories}
        multi
        items={categories.map(item => ({
          id: item.id,
          label: item.label,
          sublabel: counts.books(item.book_count),
          accent: item.accent,
        }))}
        selected={form.categoryIds}
        emptyLabel={words.noCategoriesPicker}
        onClose={() => setShowCategoryPicker(false)}
        onChange={next => patch({ categoryIds: next })}
      />

      <AdminPickerSheet
        visible={showCollectionPicker}
        title={words.collections}
        multi
        // Trending has no membership to join — the server draws it weekly —
        // so it is not offered. The other two Home rails are.
        items={collections
          .filter(
            item =>
              !item.is_system || systemShelfNote(item.slug)?.curated !== false,
          )
          .map(item => ({
            id: item.id,
            label: item.title,
            sublabel: item.is_system
              ? `${systemShelfNote(item.slug)?.label ?? s.adminLibrary.shelfNotes.homeRail} · ${counts.books(item.book_count)}`
              : `${counts.books(item.book_count)}${
                  item.is_published ? '' : words.hiddenSuffix
                }`,
            badges: item.is_system
              ? [{ label: words.homeRail, tone: 'neutral' as const }]
              : undefined,
          }))}
        selected={form.collectionIds}
        emptyLabel={words.noCollectionsPicker}
        onClose={() => setShowCollectionPicker(false)}
        onChange={next => patch({ collectionIds: next })}
      />

      <AdminConfirmSheet
        visible={confirmDelete}
        title={words.deleteTitle(form.title || words.thisBook)}
        message={words.deleteMessage}
        consequences={[
          words.readersProgress(existing?.reader_count ?? 0),
          words.downloadsOnDevices(existing?.download_count ?? 0),
          words.uploadedFiles(formatBytes(form.fileSizeBytes)),
          words.placeIn(form.collectionIds.length),
        ]}
        confirmPhrase={form.isPublished ? form.title : null}
        confirmLabel={words.delete}
        destructive
        footnote={words.unpublishKeeps}
        loading={deleteBooks.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          bookId &&
          deleteBooks.mutate([bookId], {
            onSuccess: () => {
              setConfirmDelete(false);
              reset();
              toast.success(words.bookDeleted);
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
  grow: {
    flex: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.72,
  },
});
