import { Pressable, View } from 'react-native';
import { LayoutGrid, List } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeContext';

export type SearchBookViewMode = 'grid' | 'list';

type SearchViewToggleProps = {
  value: SearchBookViewMode;
  onChange: (value: SearchBookViewMode) => void;
};

export function SearchViewToggle({ value, onChange }: SearchViewToggleProps) {
  const { colors } = useTheme();

  return (
    <View className="flex-row rounded-[12px] border border-app-border bg-app-surface p-1 dark:border-app-border-dark dark:bg-app-surface-dark">
      <Pressable
        onPress={() => onChange('grid')}
        accessibilityRole="button"
        accessibilityLabel="Grid view"
        accessibilityState={{ selected: value === 'grid' }}
        className={`h-9 w-9 items-center justify-center rounded-[10px] ${
          value === 'grid' ? 'bg-app-fill dark:bg-app-fill-dark' : ''
        }`}>
        <LayoutGrid
          size={18}
          color={value === 'grid' ? colors.primary : colors.faint}
          strokeWidth={1.75}
        />
      </Pressable>
      <Pressable
        onPress={() => onChange('list')}
        accessibilityRole="button"
        accessibilityLabel="List view"
        accessibilityState={{ selected: value === 'list' }}
        className={`h-9 w-9 items-center justify-center rounded-[10px] ${
          value === 'list' ? 'bg-app-fill dark:bg-app-fill-dark' : ''
        }`}>
        <List
          size={18}
          color={value === 'list' ? colors.primary : colors.faint}
          strokeWidth={1.75}
        />
      </Pressable>
    </View>
  );
}
