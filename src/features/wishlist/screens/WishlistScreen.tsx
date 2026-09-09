import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { api } from '@/api';
import type { BookCard } from '@/api/types';
import { EmptyState, ListRow, Screen, ScreenHeader, Section } from '@/components/layout';
import { ROUTES } from '@/constants/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import { palette } from '@/theme/palette';
import { Heart } from 'lucide-react-native';

type WishItem = {
  book_id: string;
  book?: Partial<BookCard> & { author?: { name?: string } | null };
};

export function WishlistScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.wishlistList();
      const list = Array.isArray(data)
        ? data
        : ((data as { items?: WishItem[] })?.items ?? []);
      setItems(list as WishItem[]);
    } catch (err) {
      Alert.alert(
        'Wishlist',
        err instanceof Error ? err.message : 'Could not load wishlist',
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <ScreenHeader title="Wishlist" subtitle="Saved for later reading." />

      {loading ? (
        <View className="items-center py-16">
          <ActivityIndicator color={palette.green} />
        </View>
      ) : items.length > 0 ? (
        <Section>
          {items.map((item, index) => {
            const title = item.book?.title ?? 'Untitled';
            const subtitle =
              item.book?.author?.name ??
              item.book?.author_name ??
              item.book?.genre ??
              '';
            return (
              <Pressable
                key={item.book_id}
                onPress={() =>
                  navigation.navigate(ROUTES.BOOK_DETAIL, {
                    bookId: item.book?.id ?? item.book_id,
                  })
                }>
                <ListRow
                  title={title}
                  subtitle={subtitle}
                  isLast={index === items.length - 1}
                  leading={
                    <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-app-fill dark:bg-app-fill-dark">
                      <Heart
                        color={palette.green}
                        size={16}
                        strokeWidth={2.2}
                        fill={palette.yellowGreen}
                      />
                    </View>
                  }
                />
              </Pressable>
            );
          })}
        </Section>
      ) : (
        <EmptyState
          title="Nothing saved yet"
          message="Tap the heart on any book to keep it here for later."
        />
      )}
    </Screen>
  );
}
