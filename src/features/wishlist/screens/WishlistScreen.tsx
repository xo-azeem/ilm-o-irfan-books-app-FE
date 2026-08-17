import { useCallback } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Heart } from 'lucide-react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import { GuestAuthPanel } from '@/components/auth/GuestAuthPanel';
import { EmptyState, ListRow, Screen, ScreenHeader, Section } from '@/components/layout';
import { Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useWishlist, useWishlistMutation } from '@/hooks/useAccount';
import { palette } from '@/theme/palette';
import { useAuthStore } from '@/stores/authStore';

export function WishlistScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const { data: items = [], isLoading } = useWishlist();

  const handlePress = useCallback(
    (bookId: string) => {
      navigation.navigate(ROUTES.BOOK_DETAIL, { bookId });
    },
    [navigation],
  );

  return (
    <Screen>
      <ScreenHeader title="Wishlist" subtitle="Saved for later reading." />

      {!isAuthenticated ? (
        <GuestAuthPanel
          title="Save books for later"
          message="Sign in to keep a wishlist that syncs across your devices."
        />
      ) : isLoading ? (
        <ActivityIndicator className="py-10" />
      ) : items.length > 0 ? (
        <Section>
          {items.map((item, index) => (
            <WishlistRow
              key={item.id}
              id={item.id}
              title={item.title}
              subtitle={item.author}
              isLast={index === items.length - 1}
              onPress={() => handlePress(item.id)}
            />
          ))}
        </Section>
      ) : (
        <EmptyState
          title="Nothing saved yet"
          message="Tap the heart on any book to keep it here for later."
        />
      )}

      <View className="mt-6 rounded-[16px] border border-app-border bg-app-surface-raised px-4 py-4 dark:border-app-border-dark dark:bg-app-surface-raised-dark">
        <Text className="text-[15px] leading-5 text-app-muted dark:text-app-muted-dark">
          Your wishlist syncs across devices once you sign in.
        </Text>
      </View>
    </Screen>
  );
}

function WishlistRow({
  id,
  title,
  subtitle,
  isLast,
  onPress,
}: {
  id: string;
  title: string;
  subtitle: string;
  isLast: boolean;
  onPress: () => void;
}) {
  const mutation = useWishlistMutation(id);

  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      isLast={isLast}
      onPress={onPress}
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
      trailing={
        <Pressable onPress={() => mutation.mutate(true)} hitSlop={8}>
          <Text className="text-[13px] font-medium text-app-primary dark:text-app-primary-dark">
            Remove
          </Text>
        </Pressable>
      }
    />
  );
}
