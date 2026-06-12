import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';

import { categories } from '../data/exploreContent';
import type { CategoryItem } from '../data/exploreContent';
import { ExploreSectionHeader } from './ExploreSectionHeader';

type CategoryGridItemProps = {
  category: CategoryItem;
  onPress?: () => void;
};

function CategoryGridItem({ category, onPress }: CategoryGridItemProps) {
  const isDark = useColorScheme() === 'dark';
  const accent = isDark ? category.accentDark : category.accent;
  const Icon = category.icon;

  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-85"
      style={styles.gridItem}>
      <View
        style={[styles.card, { backgroundColor: `${accent}${isDark ? '22' : '14'}` }]}>
        <View style={styles.cardTop}>
          <View style={[styles.iconWrap, { backgroundColor: `${accent}${isDark ? '40' : '28'}` }]}>
            <Icon size={20} color={accent} strokeWidth={1.75} />
          </View>
          <ChevronRight size={16} color={accent} strokeWidth={2} />
        </View>

        <View className="mt-4 gap-1">
          <DisplayText
            className="text-[15px] font-semibold leading-5 text-app-ink dark:text-app-ink-dark"
            numberOfLines={2}>
            {category.label}
          </DisplayText>
          <Text className="text-[12px] font-medium text-app-muted dark:text-app-muted-dark">
            {category.count} books
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function CategoryBrowseSection() {
  return (
    <View className="mb-8">
      <ExploreSectionHeader
        title="Browse by category"
        subtitle="Explore topics that interest you"
      />

      <View style={styles.grid}>
        {categories.map(category => (
          <CategoryGridItem key={category.id} category={category} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '47.5%',
  },
  card: {
    minHeight: 132,
    borderRadius: 16,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
});
