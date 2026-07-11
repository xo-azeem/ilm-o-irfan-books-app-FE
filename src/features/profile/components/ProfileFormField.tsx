import { memo } from 'react';
import {
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

const FIELD_MIN_HEIGHT = 52;
const MULTILINE_MIN_HEIGHT = 108;

type ProfileFormFieldProps = {
  label: string;
  value: string;
  isEditing: boolean;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  multiline?: boolean;
};

export const ProfileFormField = memo(function ProfileFormField({
  label,
  value,
  isEditing,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
}: ProfileFormFieldProps) {
  const { colors } = useTheme();
  const hasValue = value.trim().length > 0;
  const minHeight = multiline ? MULTILINE_MIN_HEIGHT : FIELD_MIN_HEIGHT;

  return (
    <View className="gap-2">
      <Text className="px-1 text-[13px] font-medium text-app-muted dark:text-app-muted-dark">
        {label}
      </Text>

      <View
        className="justify-center rounded-[12px] border border-app-border bg-app-surface px-4 dark:border-app-border-dark dark:bg-app-surface-dark"
        style={{ minHeight }}>
        {isEditing ? (
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
            style={{
              minHeight: multiline ? MULTILINE_MIN_HEIGHT - 24 : FIELD_MIN_HEIGHT - 24,
              paddingVertical: multiline ? 10 : 0,
            }}
          />
        ) : (
          <Text
            className={`text-[17px] leading-[22px] ${
              hasValue
                ? 'text-app-muted dark:text-app-muted-dark'
                : 'text-app-faint dark:text-app-faint-dark'
            }`}>
            {hasValue ? value : '—'}
          </Text>
        )}
      </View>
    </View>
  );
});
