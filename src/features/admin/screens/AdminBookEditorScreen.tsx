import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { pick, types, isErrorWithCode, errorCodes, keepLocalCopy } from '@react-native-documents/picker';

import { Screen, ScreenHeader } from '@/components/layout';
import { Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import {
  AdminBackLink,
  AdminChip,
  AdminField,
  AdminPrimaryButton,
  AdminScreenBlock,
} from '@/features/admin/components/AdminUi';
import type { AdminBooksStackParamList } from '@/features/admin/navigation/types';
import {
  useAdminAuthors,
  useAdminBook,
  useAdminCategories,
  useAdminCollections,
  useDeleteAdminBook,
  useSaveAdminBook,
} from '@/hooks/useAdmin';
import {
  COVER_MAX_BYTES,
  PDF_MAX_BYTES,
  slugify,
  uploadAdminCover,
  uploadAdminPdf,
} from '@/services/admin';
import { palette } from '@/theme/palette';

const DEFAULT_COLOR = palette.green;

export function AdminBookEditorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminBooksStackParamList>>();
  const route = useRoute<RouteProp<AdminBooksStackParamList, 'AdminBookEditor'>>();
  const bookId = route.params?.bookId;
  const { data: existing } = useAdminBook(bookId);
  const { data: authors = [] } = useAdminAuthors();
  const { data: categories = [] } = useAdminCategories();
  const { data: collections = [] } = useAdminCollections();
  const saveBook = useSaveAdminBook();
  const deleteBook = useDeleteAdminBook();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [genre, setGenre] = useState('');
  const [tag, setTag] = useState('');
  const [coverColor, setCoverColor] = useState(DEFAULT_COLOR as string);
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setSlug(existing.slug);
    setDescription(existing.description);
    setAuthorId(existing.author_id);
    setGenre(existing.genre ?? '');
    setTag(existing.tag ?? '');
    setCoverColor(existing.cover_color ?? DEFAULT_COLOR);
    setCoverPath(existing.cover_path);
    setPdfPath(existing.pdf_path);
    setFileSizeBytes(existing.file_size_bytes);
    setIsPremium(existing.is_premium);
    setIsPublished(existing.is_published);
    setCategoryIds(existing.category_ids);
    setCollectionIds(existing.collection_ids);
  }, [existing]);

  const resolvedSlug = useMemo(() => slug || slugify(title), [slug, title]);

  const toggleId = (list: string[], id: string, setter: (next: string[]) => void) => {
    setter(list.includes(id) ? list.filter(item => item !== id) : [...list, id]);
  };

  const handleCover = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    if (asset.fileSize && asset.fileSize > COVER_MAX_BYTES) {
      Alert.alert('Cover too large', 'Covers must be 5 MB or smaller.');
      return;
    }
    setUploading(true);
    try {
      const path = await uploadAdminCover(asset.uri, resolvedSlug || 'cover', asset.type ?? 'image/jpeg');
      setCoverPath(path);
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Could not upload cover.');
    } finally {
      setUploading(false);
    }
  };

  const handlePdf = async () => {
    try {
      const [file] = await pick({ type: [types.pdf], allowMultiSelection: false });
      if (file.size && file.size > PDF_MAX_BYTES) {
        Alert.alert('PDF too large', 'PDFs must be 100 MB or smaller.');
        return;
      }
      setUploading(true);
      const [local] = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: file.name ?? `${resolvedSlug || 'book'}.pdf` }],
        destination: 'cachesDirectory',
      });
      if (local.status !== 'success') {
        throw new Error('Could not copy the selected PDF.');
      }
      const uploaded = await uploadAdminPdf(local.localUri, resolvedSlug || 'book', file.size ?? undefined);
      setPdfPath(uploaded.path);
      setFileSizeBytes(uploaded.sizeBytes);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Could not upload PDF.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Enter a book title.');
      return;
    }
    if (!authorId) {
      Alert.alert('Missing author', 'Choose an author, or create one in Catalog first.');
      return;
    }
    if (isPublished && !pdfPath) {
      Alert.alert('PDF required', 'Upload a PDF before publishing.');
      return;
    }

    saveBook.mutate(
      {
        id: bookId,
        input: {
          title,
          slug: resolvedSlug,
          description,
          author_id: authorId,
          genre,
          tag,
          cover_color: coverColor,
          cover_color_dark: coverColor,
          cover_path: coverPath,
          pdf_path: pdfPath,
          file_size_bytes: fileSizeBytes,
          read_time_minutes: null,
          price_cents: 0,
          currency: 'PKR',
          format: 'Digital edition',
          is_premium: isPremium,
          is_published: isPublished,
          category_ids: categoryIds,
          collection_ids: collectionIds,
        },
      },
      {
        onSuccess: () => navigation.goBack(),
        onError: error =>
          Alert.alert('Save failed', error instanceof Error ? error.message : 'Try again.'),
      },
    );
  };

  return (
    <Screen>
      <AdminBackLink />
      <ScreenHeader title={bookId ? 'Edit book' : 'New book'} subtitle="Metadata, files, and publish state." />

      <AdminScreenBlock>
        <AdminField label="Title" value={title} onChangeText={setTitle} />
        <AdminField
          label="Slug"
          value={slug}
          onChangeText={setSlug}
          placeholder={slugify(title) || 'auto-from-title'}
          autoCapitalize="none"
        />
        <AdminField label="Description" value={description} onChangeText={setDescription} multiline />
        <AdminField label="Genre" value={genre} onChangeText={setGenre} />
        <AdminField label="Tag" value={tag} onChangeText={setTag} />
        <AdminField label="Cover color" value={coverColor} onChangeText={setCoverColor} autoCapitalize="none" />

        <View className="gap-2">
          <Text className="px-1 text-[13px] font-medium text-app-muted dark:text-app-muted-dark">
            Author
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {authors.map(author => (
              <AdminChip
                key={author.id}
                label={author.name}
                selected={authorId === author.id}
                onPress={() => setAuthorId(author.id)}
              />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="px-1 text-[13px] font-medium text-app-muted dark:text-app-muted-dark">
            Categories
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map(category => (
              <AdminChip
                key={category.id}
                label={category.label}
                selected={categoryIds.includes(category.id)}
                onPress={() => toggleId(categoryIds, category.id, setCategoryIds)}
              />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="px-1 text-[13px] font-medium text-app-muted dark:text-app-muted-dark">
            Collections
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {collections.map(collection => (
              <AdminChip
                key={collection.id}
                label={collection.title}
                selected={collectionIds.includes(collection.id)}
                onPress={() => toggleId(collectionIds, collection.id, setCollectionIds)}
              />
            ))}
          </View>
        </View>

        <View className="flex-row items-center justify-between rounded-[12px] bg-app-surface px-4 py-3 dark:bg-app-surface-dark">
          <Text className="text-[16px] text-app-ink dark:text-app-ink-dark">Premium badge</Text>
          <Switch value={isPremium} onValueChange={setIsPremium} />
        </View>
        <View className="flex-row items-center justify-between rounded-[12px] bg-app-surface px-4 py-3 dark:bg-app-surface-dark">
          <Text className="text-[16px] text-app-ink dark:text-app-ink-dark">Published</Text>
          <Switch value={isPublished} onValueChange={setIsPublished} />
        </View>

        <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
          Cover: {coverPath ? 'uploaded' : 'none'} · PDF: {pdfPath ? 'uploaded' : 'none'}
        </Text>

        <AdminPrimaryButton
          label={uploading ? 'Uploading…' : 'Upload cover'}
          disabled={uploading}
          onPress={() => {
            void handleCover();
          }}
        />
        <AdminPrimaryButton
          label={uploading ? 'Uploading…' : 'Upload PDF'}
          disabled={uploading}
          onPress={() => {
            void handlePdf();
          }}
        />

        {bookId && pdfPath ? (
          <Pressable
            onPress={() =>
              navigation.navigate(ADMIN_ROUTES.PDF_PREVIEW, { bookId, title: title || 'Preview' })
            }
            className="h-[50px] items-center justify-center rounded-[14px] border border-app-border bg-app-surface dark:border-app-border-dark dark:bg-app-surface-dark">
            <Text className="text-[16px] font-semibold text-app-ink dark:text-app-ink-dark">
              Preview PDF
            </Text>
          </Pressable>
        ) : null}

        <AdminPrimaryButton
          label={saveBook.isPending ? 'Saving…' : 'Save book'}
          disabled={saveBook.isPending || uploading}
          onPress={handleSave}
        />

        {bookId ? (
          <AdminPrimaryButton
            label="Delete book"
            destructive
            disabled={deleteBook.isPending}
            onPress={() =>
              Alert.alert(
                'Delete this book?',
                'Reading progress, wishlist rows, and downloads for this title will also be removed.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () =>
                      deleteBook.mutate(bookId, {
                        onSuccess: () => navigation.goBack(),
                        onError: error =>
                          Alert.alert(
                            'Delete failed',
                            error instanceof Error ? error.message : 'Try again.',
                          ),
                      }),
                  },
                ],
              )
            }
          />
        ) : null}
      </AdminScreenBlock>
    </Screen>
  );
}
