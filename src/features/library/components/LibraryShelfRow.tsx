import { memo } from 'react';
import { View, useColorScheme } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { ListRow } from '@/components/layout';
import { Text } from '@/components/ui';
import { theme } from '@/theme/palette';
import type { LibraryShelf } from '@/features/library/data/libraryContent';

type LibraryShelfRowProps = {
  shelf: LibraryShelf;
  isLast: boolean;
  onPress?: () => void;
};

export const LibraryShelfRow = memo(function LibraryShelfRow({
  shelf,
  isLast,
  onPress,
}: LibraryShelfRowProps) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const accent = isDark ? shelf.accentDark : shelf.accent;
  const Icon = shelf.icon;

  return (
    <ListRow
      title={shelf.label}
      leading={
        <View
          className="h-9 w-9 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: `${accent}${isDark ? '20' : '12'}` }}>
          <Icon size={17} color={accent} strokeWidth={1.75} />
        </View>
      }
      trailing={
        <View className="flex-row items-center gap-1.5">
          {shelf.count ? (
            <Text className="text-[15px] text-app-faint dark:text-app-faint-dark">
              {shelf.count}
            </Text>
          ) : null}
          <ChevronRight color={colors.faint} size={15} strokeWidth={2.25} />
        </View>
      }
      isLast={isLast}
      onPress={onPress}
    />
  );
});
