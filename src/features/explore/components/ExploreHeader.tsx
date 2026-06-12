import { Pressable, View } from 'react-native';
import { BookOpen } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import { palette } from '@/theme/palette';

type ExploreHeaderProps = {
  onProfilePress?: () => void;
};

export function ExploreHeader({ onProfilePress }: ExploreHeaderProps) {
  return (
    <View className="mb-7">
      <View className="flex-row items-center justify-between gap-4">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-app-primary dark:bg-app-primary-dark">
            <BookOpen color="#FFFFFF" size={20} strokeWidth={1.75} />
          </View>
          <View className="min-w-0 flex-1 gap-0.5">
            <DisplayText className="text-[22px] font-bold leading-7 tracking-tight text-app-ink dark:text-app-ink-dark">
              Ilm o Irfan
            </DisplayText>
            <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
              Knowledge & spirituality
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onProfilePress}
          className="h-10 w-10 items-center justify-center rounded-full border border-app-border bg-app-surface active:opacity-70 dark:border-app-border-dark dark:bg-app-surface-dark">
          <Text className="text-[13px] font-semibold text-app-primary dark:text-app-primary-dark">
            IO
          </Text>
        </Pressable>
      </View>

      <View
        className="mt-5 h-[3px] w-10 rounded-full"
        style={{ backgroundColor: palette.yellowGreen }}
      />
    </View>
  );
}
