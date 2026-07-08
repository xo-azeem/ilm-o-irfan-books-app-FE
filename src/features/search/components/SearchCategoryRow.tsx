import { memo } from 'react';
import { View, useColorScheme } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { ListRow, Section } from '@/components/layout';
import { Text } from '@/components/ui';
import { categories } from '@/features/explore/data/exploreContent';
import type { CategoryItem } from '@/features/explore/data/exploreContent';
import { theme } from '@/theme/palette';

type CategoryIconProps = {
  category: CategoryItem;
};

const CategoryIcon = memo(function CategoryIcon({ category }: CategoryIconProps) {
  const isDark = useColorScheme() === 'dark';
  const accent = isDark ? category.accentDark : category.accent;
  const Icon = category.icon;

  return (
    <View
      className="h-9 w-9 items-center justify-center rounded-[10px]"
      style={{ backgroundColor: `${accent}${isDark ? '20' : '12'}` }}>
      <Icon size={17} color={accent} strokeWidth={1.75} />
    </View>
  );
});

type SearchCategoryRowProps = {
  category: CategoryItem;
  isLast: boolean;
  onPress?: () => void;
};

const SearchCategoryRow = memo(function SearchCategoryRow({
  category,
  isLast,
  onPress,
}: SearchCategoryRowProps) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? theme.dark : theme.light;

  return (
    <ListRow
      title={category.label}
      leading={<CategoryIcon category={category} />}
      trailing={
        <View className="flex-row items-center gap-1">
          <Text className="text-[15px] text-app-faint dark:text-app-faint-dark">
            {category.count}
          </Text>
          <ChevronRight color={colors.faint} size={15} strokeWidth={2.25} />
        </View>
      }
      isLast={isLast}
      onPress={onPress}
    />
  );
});

export const SearchCategorySection = memo(function SearchCategorySection() {
  return (
    <Section title="Categories" className="mb-8">
      {categories.map((category, index) => (
        <SearchCategoryRow
          key={category.id}
          category={category}
          isLast={index === categories.length - 1}
        />
      ))}
    </Section>
  );
});
