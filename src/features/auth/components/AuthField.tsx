import { memo, useState } from 'react';
import {
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';

import { Text } from '@/components/ui';
import { fonts } from '@/theme/palette';
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
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  editable?: boolean;
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
  editable = true,
  returnKeyType,
  onSubmitEditing,
}: AuthFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-2">
      <Text className="px-1 text-[13px] font-medium text-app-muted dark:text-app-muted-dark">
        {label}
      </Text>
      <View
        className={`justify-center rounded-[12px] border bg-app-surface px-4 dark:bg-app-surface-dark ${
          focused
            ? 'border-app-primary dark:border-app-primary-dark'
            : 'border-app-border dark:border-app-border-dark'
        }`}
        style={{ minHeight: FIELD_MIN_HEIGHT, opacity: editable ? 1 : 0.6 }}>
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
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={colors.primary}
          className="w-full text-[17px] leading-[22px] text-app-ink dark:text-app-ink-dark"
          style={{
            fontFamily: fonts.sans,
            minHeight: FIELD_MIN_HEIGHT - 24,
            paddingVertical: 0,
            margin: 0,
          }}
        />
      </View>
    </View>
  );
});
