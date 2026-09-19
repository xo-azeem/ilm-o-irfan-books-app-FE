import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  Button,
  Card,
  EmptyState,
  Label,
  ProgressBar,
  showDialog,
  Text,
} from '@/components/ui';
import { DownloadsCatalogSkeleton } from '@/components/skeletons/CatalogSkeletons';
import {
  DownloadBookRow,
  type DownloadEntry,
} from '@/features/profile/components/DownloadBookRow';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import type { ProfileStackParamList } from '@/features/profile/navigation/types';
import { useLibrary, useRemoveDownload } from '@/hooks/useAccount';
import { useVaultVersion } from '@/hooks/useBookVault';
import { getVaultEntry, vaultUsage } from '@/services/bookVault';
import { isUrduTitle } from '@/services/script';
import { fontSize } from '@/theme/typography';
import { useStrings, type Strings } from '@/i18n';

type DownloadsNavigation = NativeStackNavigationProp<
  ProfileStackParamList,
  'Downloads'
>;

/** The device allowance the storage bar is drawn against. */
const STORAGE_LIMIT_BYTES = 4 * 1_000_000_000;

function formatSize(bytes: number, s: Strings): string {
  if (bytes >= 1_000_000_000) {
    return s.profile.downloads.gb((bytes / 1_000_000_000).toFixed(1));
  }
  return s.profile.downloads.mb(Math.round(bytes / 1_000_000));
}

/**
 * Downloads.
 *
 * Storage first, then the books — because the question a reader opens this
 * screen with is almost always "what is taking up space?".
 */
export function DownloadsScreen() {
  const navigation = useNavigation<DownloadsNavigation>();
  const s = useStrings();
  const words = s.profile.downloads;
  const { data: library, isLoading } = useLibrary();
  const removeDownload = useRemoveDownload();
  // The backend lists what the reader downloaded; the vault knows what is
  // actually sealed on *this* device. A row is drawn from both, so a book
  // downloaded on another phone — or lost to a reinstall — says so instead
  // of promising to open without a connection.
  const vault = useVaultVersion();

  const downloads = useMemo<DownloadEntry[]>(
    () =>
      (library?.downloads ?? []).map(book => {
        const local = getVaultEntry(book.id);
        const onDevice = local?.tier === 'kept';
        return {
          id: book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          coverColor: book.coverColor,
          coverColorDark: book.coverColorDark,
          isUrdu: isUrduTitle(book.title),
          detail: onDevice
            ? words.availableOffline(formatSize(local.bytes, s))
            : words.notOnDevice(formatSize(book.sizeBytes, s)),
        };
      }),
    // `vault` is the dependency that matters even though the body never reads it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [library?.downloads, s, vault],
  );

  // What is really on disk, not what the backend remembers.
  const usedBytes = useMemo(
    () => vaultUsage().kept,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vault],
  );

  const handleRemove = useCallback(
    (entry: DownloadEntry) => {
      showDialog({
        title: words.removeTitle,
        message: words.removeMessage(entry.title),
        icon: Trash2,
        actions: [
          { label: s.common.cancel, style: 'cancel' },
          {
            label: s.common.remove,
            style: 'destructive',
            onPress: () => removeDownload.mutate(entry.id),
          },
        ],
      });
    },
    [removeDownload, s, words],
  );

  const handleRemoveAll = useCallback(() => {
    showDialog({
      title: words.removeAllTitle,
      message: words.removeAllMessage,
      icon: Trash2,
      actions: [
        { label: s.common.cancel, style: 'cancel' },
        {
          label: words.removeAll,
          style: 'destructive',
          onPress: () =>
            downloads.forEach(entry => removeDownload.mutate(entry.id)),
        },
      ],
    });
  }, [downloads, removeDownload, s, words]);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <ProfileSubScreenLayout
      title={words.title}
      subtitle={
        downloads.length === 1
          ? words.oneOffline
          : words.manyOffline(downloads.length)
      }
      gap={20}
    >
      {isLoading ? (
        <DownloadsCatalogSkeleton />
      ) : downloads.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            title={words.emptyTitle}
            message={words.emptyMessage}
            action={{ label: words.backToProfile, onPress: goBack }}
          />
        </View>
      ) : (
        <>
          <Card tone="surface" padded={16} gap={12}>
            <View style={styles.storageHeader}>
              <Text size={fontSize.body} leading={1}>
                {words.used(formatSize(usedBytes, s))}
              </Text>
              <Label tracking={0.9}>
                {words.ofLimit(formatSize(STORAGE_LIMIT_BYTES, s))}
              </Label>
            </View>
            <ProgressBar value={usedBytes / STORAGE_LIMIT_BYTES} height={7} />
            <Text size={12.5} leading={1.3} tone="muted">
              {words.autoRemoved}
            </Text>
          </Card>

          <View style={styles.list}>
            {downloads.map(entry => (
              <DownloadBookRow
                key={entry.id}
                entry={entry}
                onRemove={handleRemove}
              />
            ))}
          </View>

          <Button
            label={words.removeAll}
            variant="danger"
            size="md"
            onPress={handleRemoveAll}
          />
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
