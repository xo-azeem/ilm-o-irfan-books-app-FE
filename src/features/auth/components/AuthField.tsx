import { memo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';

import { Text } from '@/components/ui';
import { fonts, typography } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import { useAuthLayoutMetrics } from '../hooks/useAuthLayoutMetrics';

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
  returnKeyType,
  onSubmitEditing,
}: AuthFieldProps) {
  const { isDark, colors } = useTheme();
  const layout = useAuthLayoutMetrics(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 8 }}>
      <Text
        className="text-app-muted dark:text-app-muted-dark"
        style={{
          fontSize: 13,
          fontWeight: '500',
          letterSpacing: typography.wide,
          paddingHorizontal: 2,
        }}>
        {label}
      </Text>
      <View
        style={{
          height: layout.fieldHeight,
          borderRadius: layout.inputRadius,
          paddingHorizontal: 16,
          justifyContent: 'center',
          backgroundColor: isDark
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.92)',
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: focused
            ? colors.primary
            : isDark
              ? 'rgba(240,246,236,0.12)'
              : 'rgba(20,40,24,0.10)',
        }}>
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={colors.primary}
          style={{
            fontFamily: fonts.sans,
            fontSize: 17,
            letterSpacing: typography.snug,
            color: colors.ink,
            paddingVertical: Platform.OS === 'ios' ? 12 : 10,
            margin: 0,
          }}
        />
      </View>
    </View>
  );
});
