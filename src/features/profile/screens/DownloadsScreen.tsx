import { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Download } from 'lucide-react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import { api } from '@/api';
import { DisplayText, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import {
  DownloadBookRow,
  getDownloadsTotalSize,
  type DownloadedBook,
} from '@/features/profile/components/DownloadBookRow';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { useTheme } from '@/theme/ThemeContext';
import { palette } from '@/theme/palette';

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
              Reported offline
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<DownloadedBook[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.downloadsList();
      const rows = Array.isArray(data)
        ? data
        : ((data as { items?: unknown[] })?.items ?? []);
      const mapped: DownloadedBook[] = (rows as Array<{
        book_id?: string;
        file_size_bytes?: number | null;
        book?: {
          id?: string;
          title?: string;
          author?: { name?: string } | null;
          cover_color?: string | null;
          cover_color_dark?: string | null;
        };
      }>).map(row => {
        const mb = Math.max(
          1,
          Math.round((row.file_size_bytes ?? 1_000_000) / (1024 * 1024)),
        );
        return {
          id: row.book?.id ?? row.book_id ?? String(Math.random()),
          title: row.book?.title ?? 'Untitled',
          author: row.book?.author?.name ?? 'Unknown author',
          size: `${mb} MB`,
          coverColor: row.book?.cover_color ?? palette.green,
          coverColorDark: row.book?.cover_color_dark ?? '#1A332C',
        };
      });
      setItems(mapped);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const removeItem = useCallback((id: string) => {
    setItems(current => current.filter(item => item.id !== id));
  }, []);

  const totalSize = getDownloadsTotalSize(items);

  return (
    <ProfileSubScreenLayout
      title="Downloads"
      subtitle="Books recorded for offline reading.">
      {loading ? (
        <View className="items-center py-16">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View className="items-center rounded-[16px] border border-app-border bg-app-surface px-6 py-14 dark:border-app-border-dark dark:bg-app-surface-dark">
          <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-app-fill dark:bg-app-fill-dark">
            <Download size={22} color={colors.primary} strokeWidth={1.75} />
          </View>
          <DisplayText className="mb-2 text-center text-[17px] font-semibold text-app-ink dark:text-app-ink-dark">
            No downloads yet
          </DisplayText>
          <Text className="text-center text-[14px] text-app-muted dark:text-app-muted-dark">
            Open a book with an active membership to save it offline.
          </Text>
        </View>
      ) : (
        <View className="gap-5">
          <DownloadsSummary bookCount={items.length} totalSize={totalSize} />
          <View className="overflow-hidden rounded-[16px] bg-app-surface dark:bg-app-surface-dark">
            {items.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  navigation.navigate(ROUTES.BOOK_DETAIL, { bookId: item.id })
                }>
                <DownloadBookRow
                  book={item}
                  isLast={index === items.length - 1}
                  onRemove={() => removeItem(item.id)}
                />
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ProfileSubScreenLayout>
  );
});
