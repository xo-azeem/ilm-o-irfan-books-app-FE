import { View } from 'react-native';
import { Heart } from 'lucide-react-native';

import { EmptyState, ListRow, Screen, ScreenHeader, Section } from '@/components/layout';
import { Text } from '@/components/ui';

const wishlistItems = [
  {
    title: 'The Names of Allah',
    subtitle: 'A guided series on divine attributes.',
  },
  {
    title: 'Fiqh of Prayer',
    subtitle: 'Essentials every Muslim should know.',
  },
  {
    title: 'Stories of the Prophets',
    subtitle: 'Weekly reflections and summaries.',
  },
];

export function WishlistScreen() {
  return (
    <Screen>
      <ScreenHeader
        title="Wishlist"
        subtitle="Saved for later reading."
      />

      {wishlistItems.length > 0 ? (
        <Section>
          {wishlistItems.map((item, index) => (
            <ListRow
              key={item.title}
              title={item.title}
              subtitle={item.subtitle}
              isLast={index === wishlistItems.length - 1}
              leading={
                <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-rose-50 dark:bg-rose-950">
                  <Heart color="#FF3B30" size={16} strokeWidth={2.2} fill="#FF3B30" />
                </View>
              }
            />
          ))}
        </Section>
      ) : (
        <EmptyState
          title="Nothing saved yet"
          message="Tap the heart on any lesson to keep it here for later."
        />
      )}

      <View className="mt-6 rounded-[16px] bg-ios-surface px-4 py-4 dark:bg-ios-surface-dark">
        <Text className="text-[15px] leading-5 text-ios-secondary dark:text-ios-secondary-dark">
          Your wishlist syncs across devices once you sign in.
        </Text>
      </View>
    </Screen>
  );
}
