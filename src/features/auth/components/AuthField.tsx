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

type AuthFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  secureTextEntry?: boolean;
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
};

export const AuthField = memo(function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
  secureTextEntry = false,
  textContentType,
  autoComplete,
}: AuthFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      <Text className="px-1 text-[13px] font-medium text-app-muted dark:text-app-muted-dark">
        {label}
      </Text>
      <View
        className="justify-center rounded-[14px] border border-app-border bg-app-surface px-4 dark:border-app-border-dark dark:bg-app-surface-dark"
        style={{ minHeight: FIELD_MIN_HEIGHT }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor={colors.faint}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={secureTextEntry}
          textContentType={textContentType}
          autoComplete={autoComplete}
          className="w-full text-[16px] leading-[22px] text-app-ink dark:text-app-ink-dark"
          style={{ minHeight: FIELD_MIN_HEIGHT - 24 }}
        />
      </View>
    </View>
  );
});
