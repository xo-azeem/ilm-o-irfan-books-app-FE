import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/components/ui';
import type { RootTabScreenProps } from '@/app/navigation/types';
import { ROUTES } from '@/constants/routes';

type Props = RootTabScreenProps<'Home'>;

export function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pb-8 pt-6">
        <View className="gap-2">
          <Text className="text-sm font-medium uppercase tracking-widest text-brand-600 dark:text-brand-50">
            Ilm o Irfan
          </Text>
          <Text className="text-3xl font-bold">Welcome home</Text>
          <Text className="text-base leading-6 text-slate-600 dark:text-slate-300">
            Your React Native app is ready with TypeScript, NativeWind, and a
            scalable folder structure for iOS and Android.
          </Text>
        </View>

        <Card className="gap-4">
          <Text className="text-lg font-semibold">Get started</Text>
          <Text className="text-slate-600 dark:text-slate-300">
            Add features under `src/features`, shared UI under
            `src/components`, and navigation in `src/app/navigation`.
          </Text>
          <Button
            label="Explore the app"
            onPress={() => navigation.navigate(ROUTES.EXPLORE)}
          />
        </Card>

        <Card className="gap-3">
          <Text className="text-lg font-semibold">Stack</Text>
          <View className="gap-2">
            {['React Native CLI', 'TypeScript', 'NativeWind', 'React Navigation'].map(
              item => (
                <View
                  key={item}
                  className="rounded-lg bg-brand-50 px-3 py-2 dark:bg-brand-950">
                  <Text className="font-medium text-brand-900 dark:text-brand-50">
                    {item}
                  </Text>
                </View>
              ),
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
