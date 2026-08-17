import type { PropsWithChildren } from 'react';
import { Pressable, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

export function AdminBackLink({ label = 'Back' }: { label?: string }) {
  const navigation = useNavigation();
  return (
    <Pressable
      onPress={() => navigation.goBack()}
      accessibilityRole="button"
      className="-ml-1 mb-4 flex-row items-center gap-0.5 self-start py-1 active:opacity-60">
      <ChevronLeft size={22} color={palette.green} strokeWidth={2.25} />
      <Text className="text-[15px] font-medium text-app-primary dark:text-app-primary-dark">
        {label}
      </Text>
    </Pressable>
  );
}

export function AdminField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const { colors } = useTheme();
  return (
    <View className="gap-2">
      <Text className="px-1 text-[13px] font-medium text-app-muted dark:text-app-muted-dark">
        {label}
      </Text>
      <View
        className="justify-center rounded-[12px] border border-app-border bg-app-surface px-4 dark:border-app-border-dark dark:bg-app-surface-dark"
        style={{ minHeight: multiline ? 108 : 52 }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor={colors.faint}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          className="w-full text-[17px] leading-[22px] text-app-ink dark:text-app-ink-dark"
          style={{ minHeight: multiline ? 84 : 28, paddingVertical: multiline ? 10 : 0 }}
        />
      </View>
    </View>
  );
}

export function AdminPrimaryButton({
  label,
  onPress,
  disabled,
  destructive,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`h-[50px] items-center justify-center rounded-[14px] ${
        destructive
          ? 'bg-[#D14343]'
          : 'bg-app-primary dark:bg-app-primary-dark'
      }`}
      style={{ opacity: disabled ? 0.6 : 1 }}>
      <Text className="text-[16px] font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

export function AdminChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 py-1.5 ${
        selected
          ? 'bg-app-primary dark:bg-app-primary-dark'
          : 'bg-app-fill dark:bg-app-fill-dark'
      }`}>
      <Text
        className={`text-[13px] font-medium ${
          selected
            ? 'text-app-on-primary dark:text-app-on-primary-dark'
            : 'text-app-ink dark:text-app-ink-dark'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AdminScreenBlock({ children }: PropsWithChildren) {
  return <View className="gap-4">{children}</View>;
}
