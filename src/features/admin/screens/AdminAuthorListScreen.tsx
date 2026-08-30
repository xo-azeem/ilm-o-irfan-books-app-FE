import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, User } from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminSearchBar } from '@/features/admin/components/AdminControls';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminBadge,
  AdminEmpty,
  AdminErrorState,
} from '@/features/admin/components/AdminUi';
import { useDebouncedValue } from '@/features/admin/hooks/useAdminForm';
import { useAdminAuthors } from '@/hooks/useAdmin';
import { adminCoverUrl } from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminCatalogStackParamList } from '../navigation/types';

export function AdminAuthorListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminCatalogStackParamList>>();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);
  const { data = [], isLoading, error, refetch } = useAdminAuthors(debounced);

  return (
    <Screen>
      <AdminBackLink label="Catalog" />
      <ScreenHeader
        title="Authors"
        subtitle={`${data.length} in the catalog`}
        action={
          <Pressable
            onPress={() => navigation.navigate(ADMIN_ROUTES.AUTHOR_EDITOR, {})}
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: colors.primary }}>
            <Plus size={19} color={colors.onPrimary} strokeWidth={2.4} />
          </Pressable>
        }
      />

      <AdminSearchBar value={query} onChangeText={setQuery} placeholder="Search authors" />

      {isLoading ? (
        <ListRowsSkeleton rows={6} />
      ) : error ? (
        <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <AdminEmpty
          title="No authors"
          message="Every book needs an author. Add the first one to get started."
          actionLabel="Add author"
          onAction={() => navigation.navigate(ADMIN_ROUTES.AUTHOR_EDITOR, {})}
        />
      ) : (
        <View className="overflow-hidden rounded-[14px] bg-app-surface dark:bg-app-surface-dark">
          {data.map((author, index) => {
            const avatar = adminCoverUrl(author.avatar_path);
            return (
              <Pressable
                key={author.id}
                onPress={() =>
                  navigation.navigate(ADMIN_ROUTES.AUTHOR_EDITOR, { authorId: author.id })
                }
                style={({ pressed }) => (pressed ? { backgroundColor: colors.fill } : undefined)}
                className={`flex-row items-center gap-3 px-4 py-3 ${
                  index === data.length - 1
                    ? ''
                    : 'border-b border-app-border dark:border-app-border-dark'
                }`}>
                <View
                  className="h-10 w-10 items-center justify-center overflow-hidden rounded-full"
                  style={{ backgroundColor: colors.fill }}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} className="h-full w-full" />
                  ) : (
                    <User size={18} color={colors.muted} strokeWidth={2} />
                  )}
                </View>

                <View className="min-w-0 flex-1 gap-0.5">
                  <Text
                    className="text-[16px] text-app-ink dark:text-app-ink-dark"
                    numberOfLines={1}>
                    {author.name}
                  </Text>
                  <Text
                    className="text-[12px] text-app-muted dark:text-app-muted-dark"
                    numberOfLines={1}>
                    {author.slug}
                  </Text>
                </View>

                <AdminBadge
                  label={`${author.published_count}/${author.book_count} live`}
                  tone={author.book_count === 0 ? 'neutral' : 'success'}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
