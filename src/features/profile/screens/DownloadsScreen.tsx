import { memo, useCallback, useState } from 'react';
import { Pressable, View, useColorScheme } from 'react-native';
import { Trash2 } from 'lucide-react-native';

import { Section } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { BookSpine } from '@/features/library/components/BookSpine';
import { LIBRARY_COVER_WIDTH } from '@/features/library/constants';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { downloadedBooks } from '@/features/profile/data/profileContent';

const COVER_WIDTH = Math.round(LIBRARY_COVER_WIDTH * 0.55);

export const DownloadsScreen = memo(function DownloadsScreen() {
  const isDark = useColorScheme() === 'dark';
  const [items, setItems] = useState(downloadedBooks);

  const removeItem = useCallback((id: string) => {
    setItems(current => current.filter(item => item.id !== id));
  }, []);

  const totalSize = items.reduce((sum, item) => sum + parseInt(item.size, 10), 0);

  return (
    <ProfileSubScreenLayout
      title="Downloads"
      subtitle={`${items.length} books · ${totalSize} MB offline`}>
      {items.length === 0 ? (
        <View className="items-center rounded-[16px] bg-app-surface px-6 py-12 dark:bg-app-surface-dark">
          <DisplayText className="mb-2 text-center text-[17px] font-semibold text-app-ink dark:text-app-ink-dark">
            No downloads yet
          </DisplayText>
          <Text className="max-w-[260px] text-center text-[15px] leading-5 text-app-muted dark:text-app-muted-dark">
            Download books to read without an internet connection.
          </Text>
        </View>
      ) : (
        <Section>
          {items.map((book, index) => (
            <View
              key={book.id}
              className={`flex-row items-center gap-3.5 px-4 py-3.5 ${
                index < items.length - 1
                  ? 'border-b border-app-border dark:border-app-border-dark'
                  : ''
              }`}>
              <BookSpine
                title={book.title}
                coverColor={book.coverColor}
                coverColorDark={book.coverColorDark}
                width={COVER_WIDTH}
              />
              <View className="min-w-0 flex-1 gap-0.5">
                <DisplayText
                  className="text-[15px] font-semibold leading-[19px] text-app-ink dark:text-app-ink-dark"
                  numberOfLines={2}>
                  {book.title}
                </DisplayText>
                <Text className="text-[12px] text-app-muted dark:text-app-muted-dark">
                  {book.author}
                </Text>
                <Text className="text-[12px] text-app-faint dark:text-app-faint-dark">
                  {book.size}
                </Text>
              </View>
              <Pressable
                onPress={() => removeItem(book.id)}
                accessibilityLabel={`Remove ${book.title}`}
                className="h-9 w-9 items-center justify-center rounded-full bg-app-fill active:opacity-70 dark:bg-app-fill-dark">
                <Trash2
                  size={16}
                  color={isDark ? '#E86A6A' : '#D14343'}
                  strokeWidth={2}
                />
              </Pressable>
            </View>
          ))}
        </Section>
      )}
    </ProfileSubScreenLayout>
  );
});
