import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ListRow, Screen, ScreenHeader } from '@/components/layout';
import { BookCoverPlaceholder } from '@/components/books';
import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import type { AdminBooksStackParamList } from '@/features/admin/navigation/types';
import { useAdminBooks } from '@/hooks/useAdmin';
import { adminCoverUrl } from '@/services/admin';
import { palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

export function AdminBooksScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminBooksStackParamList>>();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const { data = [], isLoading } = useAdminBooks(query);

  return (
    <Screen>
      <ScreenHeader
        title="Books"
        subtitle="Drafts and published titles."
        action={
          <Pressable
            onPress={() => navigation.navigate(ADMIN_ROUTES.BOOK_EDITOR, {})}
            className="active:opacity-70">
            <Text className="text-[14px] font-semibold text-app-primary dark:text-app-primary-dark">
              New
            </Text>
          </Pressable>
        }
      />

      <View className="mb-4 rounded-[12px] border border-app-border bg-app-surface px-4 dark:border-app-border-dark dark:bg-app-surface-dark">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search titles"
          placeholderTextColor={colors.faint}
          className="h-[48px] text-[16px] text-app-ink dark:text-app-ink-dark"
        />
      </View>

      {isLoading ? (
        <ListRowsSkeleton rows={8} />
      ) : (
        <View className="overflow-hidden rounded-[14px] bg-app-surface dark:bg-app-surface-dark">
          {data.map((book, index) => (
            <ListRow
              key={book.id}
              title={book.title}
              subtitle={`${book.author_name} · ${book.is_published ? 'Published' : 'Draft'}${book.pdf_path ? '' : ' · No PDF'}`}
              isLast={index === data.length - 1}
              onPress={() => navigation.navigate(ADMIN_ROUTES.BOOK_EDITOR, { bookId: book.id })}
              leading={
                <BookCoverPlaceholder
                  width={36}
                  height={52}
                  coverColor={book.cover_color ?? palette.green}
                  coverUrl={adminCoverUrl(book.cover_path)}
                  borderRadius={8}
                  showSheen={false}
                  showSpine={false}
                />
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
