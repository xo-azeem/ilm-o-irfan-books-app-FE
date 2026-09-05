import { useCallback, useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, Card, EmptyState, Label, ProgressBar, Text } from '@/components/ui';
import { DownloadsCatalogSkeleton } from '@/components/skeletons/CatalogSkeletons';
import {
  DownloadBookRow,
  type DownloadEntry,
} from '@/features/profile/components/DownloadBookRow';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import type { ProfileStackParamList } from '@/features/profile/navigation/types';
import { useLibrary, useRemoveDownload } from '@/hooks/useAccount';
import { isUrduTitle } from '@/services/script';
import { fontSize } from '@/theme/typography';

type DownloadsNavigation = NativeStackNavigationProp<ProfileStackParamList, 'Downloads'>;

/** The device allowance the storage bar is drawn against. */
const STORAGE_LIMIT_BYTES = 4 * 1_000_000_000;

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  }
  return `${Math.round(bytes / 1_000_000)} MB`;
}

/**
 * Downloads.
 *
 * Storage first, then the books — because the question a reader opens this
 * screen with is almost always "what is taking up space?".
 */
export function DownloadsScreen() {
  const navigation = useNavigation<DownloadsNavigation>();
  const { data: library, isLoading } = useLibrary();
  const removeDownload = useRemoveDownload();

  const downloads = useMemo<DownloadEntry[]>(
    () =>
      (library?.downloads ?? []).map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        coverColor: book.coverColor,
        coverColorDark: book.coverColorDark,
        isUrdu: isUrduTitle(book.title),
        detail: `${formatSize(book.sizeBytes)} · available offline`,
      })),
    [library?.downloads],
  );

  const usedBytes = useMemo(
    () =>
      (library?.downloads ?? []).reduce(
        (total: number, book) => total + book.sizeBytes,
        0,
      ),
    [library?.downloads],
  );

  const handleRemove = useCallback(
    (entry: DownloadEntry) => {
      Alert.alert('Remove download?', `${entry.title} will stay in your library but need a connection to open.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeDownload.mutate(entry.id),
        },
      ]);
    },
    [removeDownload],
  );

  const handleRemoveAll = useCallback(() => {
    Alert.alert(
      'Remove all downloads?',
      'Every book stays in your library, but you will need a connection to open them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove all',
          style: 'destructive',
          onPress: () => downloads.forEach(entry => removeDownload.mutate(entry.id)),
        },
      ],
    );
  }, [downloads, removeDownload]);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <ProfileSubScreenLayout
      title="Downloads"
      subtitle={
        downloads.length === 1
          ? 'One book available offline.'
          : `${downloads.length} books available offline.`
      }
      gap={20}>
      {isLoading ? (
        <DownloadsCatalogSkeleton />
      ) : downloads.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            title="Nothing saved yet."
            message="Download a book from the reader and it will be here, ready without a connection."
            action={{ label: 'Back to settings', onPress: goBack }}
          />
        </View>
      ) : (
        <>
          <Card tone="surface" padded={16} gap={12}>
            <View style={styles.storageHeader}>
              <Text size={fontSize.body} leading={1}>
                {formatSize(usedBytes)} used
              </Text>
              <Label tracking={0.9}>{`OF ${formatSize(STORAGE_LIMIT_BYTES)} LIMIT`}</Label>
            </View>
            <ProgressBar value={usedBytes / STORAGE_LIMIT_BYTES} height={7} />
            <Text size={12.5} leading={1.3} tone="muted">
              Finished books are removed automatically after 30 days.
            </Text>
          </Card>

          <View style={styles.list}>
            {downloads.map(entry => (
              <DownloadBookRow key={entry.id} entry={entry} onRemove={handleRemove} />
            ))}
          </View>

          <Button label="Remove all downloads" variant="danger" size="md" onPress={handleRemoveAll} />
        </>
      )}
    </ProfileSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  list: {
    gap: 12,
  },
  empty: {
    paddingTop: 48,
  },
});
