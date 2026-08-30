import { memo, useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Avatar, FloatingAction, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminSearchBar } from '@/features/admin/components/AdminControls';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminBadge,
  AdminEmpty,
  AdminErrorState,
  AdminRowGroup,
} from '@/features/admin/components/AdminUi';
import { useDebouncedValue } from '@/features/admin/hooks/useAdminForm';
import { useAppInsets } from '@/hooks/useAppInsets';
import { useAdminAuthors } from '@/hooks/useAdmin';
import { adminCoverUrl, type AdminAuthor } from '@/services/admin';
import { layout } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminCatalogStackParamList } from '../navigation/types';

export function AdminAuthorListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminCatalogStackParamList>>();
  const { tabBarHeight } = useAppInsets();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);
  const { data = [], isLoading, error, refetch } = useAdminAuthors(debounced);

  const newAuthor = useCallback(
    () => navigation.navigate(ADMIN_ROUTES.AUTHOR_EDITOR, {}),
    [navigation],
  );

  const openAuthor = useCallback(
    (authorId: string) => navigation.navigate(ADMIN_ROUTES.AUTHOR_EDITOR, { authorId }),
    [navigation],
  );

  return (
    <Screen
      padding={layout.adminPadding}
      gap={14}
      overlay={
        <FloatingAction
          label="New author"
          icon={Plus}
          onPress={newAuthor}
          style={[styles.fab, { bottom: tabBarHeight + 14 }]}
        />
      }>
      <AdminBackLink label="Catalog" />
      <ScreenHeader title="Authors" dense subtitle={`${data.length} in the catalog`} />

      <AdminSearchBar value={query} onChangeText={setQuery} placeholder="Search authors" />

      {isLoading ? (
        <ListRowsSkeleton count={6} height={60} />
      ) : error ? (
        <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <AdminEmpty
          title="No authors yet"
          message="Every book needs an author. Add the first one to get started."
          actionLabel="Add author"
          onAction={newAuthor}
        />
      ) : (
        <AdminRowGroup>
          {data.map(author => (
            <AuthorRow key={author.id} author={author} onPress={openAuthor} />
          ))}
        </AdminRowGroup>
      )}
    </Screen>
  );
}

const AuthorRow = memo(function AuthorRow({
  author,
  onPress,
}: {
  author: AdminAuthor;
  onPress: (authorId: string) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onPress(author.id), [author.id, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={author.name}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.primaryFillSoft },
      ]}>
      <Avatar
        name={author.name}
        imageUrl={adminCoverUrl(author.avatar_path)}
        size={38}
        tone="neutral"
      />

      <View style={styles.body}>
        <Text size={14.5} leading={1.2} numberOfLines={1}>
          {author.name}
        </Text>
        <Text size={11.5} leading={1.2} tone="faint" numberOfLines={1}>
          {author.slug}
        </Text>
      </View>

      <AdminBadge
        label={`${author.published_count}/${author.book_count} live`}
        tone={author.book_count === 0 ? 'neutral' : 'success'}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  fab: {
    position: 'absolute',
    right: layout.adminPadding,
  },
});
