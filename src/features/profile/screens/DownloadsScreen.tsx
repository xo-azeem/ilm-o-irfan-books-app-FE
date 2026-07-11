import { memo, useCallback, useState } from 'react';
import { View } from 'react-native';
import { Download } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import {
  DownloadBookRow,
  getDownloadsTotalSize,
  type DownloadedBook,
} from '@/features/profile/components/DownloadBookRow';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { downloadedBooks } from '@/features/profile/data/profileContent';
import { useTheme } from '@/theme/ThemeContext';

function DownloadsSummary({
  bookCount,
  totalSize,
}: {
  bookCount: number;
  totalSize: number;
}) {
  const { colors } = useTheme();

  return (
    <View className="gap-2">
      <Text className="px-1 text-[13px] font-medium uppercase tracking-widest text-app-muted dark:text-app-muted-dark">
        Storage
      </Text>

      <View className="flex-row overflow-hidden rounded-[14px] bg-app-surface dark:bg-app-surface-dark">
        <View className="min-w-0 flex-1 flex-row items-center gap-3 px-4 py-3.5">
          <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-app-fill dark:bg-app-fill-dark">
            <Download size={17} color={colors.primary} strokeWidth={1.75} />
          </View>
          <View className="min-w-0 flex-1 gap-0.5">
            <DisplayText className="text-[18px] font-bold leading-6 tabular-nums text-app-ink dark:text-app-ink-dark">
              {totalSize} MB
            </DisplayText>
            <Text className="text-[12px] text-app-muted dark:text-app-muted-dark">
              Used offline
            </Text>
          </View>
        </View>

        <View className="w-px bg-app-border dark:bg-app-border-dark" />

        <View className="min-w-0 flex-1 items-center justify-center px-4 py-3.5">
          <DisplayText className="text-[18px] font-bold leading-6 tabular-nums text-app-ink dark:text-app-ink-dark">
            {bookCount}
          </DisplayText>
          <Text className="mt-0.5 text-[12px] text-app-muted dark:text-app-muted-dark">
            {bookCount === 1 ? 'Book' : 'Books'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export const DownloadsScreen = memo(function DownloadsScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<DownloadedBook[]>(downloadedBooks);

  const removeItem = useCallback((id: string) => {
    setItems(current => current.filter(item => item.id !== id));
  }, []);

  const totalSize = getDownloadsTotalSize(items);

  return (
    <ProfileSubScreenLayout
      title="Downloads"
      subtitle="Books saved for offline reading.">
      {items.length === 0 ? (
        <View className="items-center rounded-[16px] border border-app-border bg-app-surface px-6 py-14 dark:border-app-border-dark dark:bg-app-surface-dark">
          <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-app-fill dark:bg-app-fill-dark">
            <Download size={22} color={colors.primary} strokeWidth={1.75} />
          </View>
          <DisplayText className="mb-2 text-center text-[17px] font-semibold text-app-ink dark:text-app-ink-dark">
            No downloads yet
          </DisplayText>
          <Text className="max-w-[260px] text-center text-[14px] leading-5 text-app-muted dark:text-app-muted-dark">
            Download books from the reader to access them without an internet
            connection.
          </Text>
        </View>
      ) : (
        <View className="gap-7">
          <DownloadsSummary bookCount={items.length} totalSize={totalSize} />

          <View className="gap-2">
            <Text className="px-1 text-[13px] font-medium uppercase tracking-widest text-app-muted dark:text-app-muted-dark">
              Downloaded books
            </Text>

            <View className="overflow-hidden rounded-[14px] bg-app-surface dark:bg-app-surface-dark">
              {items.map((book, index) => (
                <DownloadBookRow
                  key={book.id}
                  book={book}
                  isLast={index === items.length - 1}
                  onRemove={removeItem}
                />
              ))}
            </View>
          </View>
        </View>
      )}
    </ProfileSubScreenLayout>
  );
});
