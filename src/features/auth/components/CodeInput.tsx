import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/ui';
import { radius } from '@/theme/palette';
import { fontSize, sansFamily, scaleFont } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';
import { useStrings } from '@/i18n';

export const CODE_LENGTH = 6;

/** Keeps only digits, at most six of them — what a paste from Mail becomes. */
export function normaliseCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

export type CodeInputProps = {
  value: string;
  onChange: (code: string) => void;
  /** Fired once the sixth digit lands, with the full code. */
  onComplete?: (code: string) => void;
  editable?: boolean;
  /** Draws the cells in the danger colour — a refused code. */
  invalid?: boolean;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Six cells, one invisible input.
 *
 * The real `TextInput` sits over the cells at zero opacity and owns the
 * keyboard, so paste, autofill from the SMS/Mail suggestion bar and the
 * number pad all work as they do on any field; the cells only draw what it
 * holds. Tapping anywhere on the row focuses it.
 */
export const CodeInput = memo(function CodeInput({
  value,
  onChange,
  onComplete,
  editable = true,
  invalid = false,
  autoFocus = false,
  style,
}: CodeInputProps) {
  const { colors, fontScale } = useTheme();
  const s = useStrings();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = useCallback(
    (next: string) => {
      const code = normaliseCode(next);
      onChange(code);
      if (code.length === CODE_LENGTH && code !== value) {
        onComplete?.(code);
      }
    },
    [onChange, onComplete, value],
  );

  const focus = useCallback(() => {
    if (editable) {
      inputRef.current?.focus();
    }
  }, [editable]);

  const cells = useMemo(
    () => Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? ''),
    [value],
  );
  const activeIndex = Math.min(value.length, CODE_LENGTH - 1);

  return (
    <Pressable
      accessible
      accessibilityLabel={s.auth.sixDigitCode}
      accessibilityValue={{ text: value }}
      onPress={focus}
      style={[styles.row, style]}
    >
      {cells.map((digit, index) => {
        const active = focused && editable && index === activeIndex;
        return (
          <View
            key={index}
            style={[
              styles.cell,
              {
                borderRadius: radius.field,
                backgroundColor: active ? colors.focus : colors.surfaceAlt,
                borderColor: invalid
                  ? colors.dangerBorder
                  : active
                    ? colors.focusBorder
                    : colors.border,
              },
            ]}
          >
            <Text
              size={fontSize.subheading}
              weight="600"
              tone={invalid ? 'danger' : 'ink'}
              style={styles.digit}
            >
              {digit}
            </Text>
            {active && !digit ? (
              <View
                style={[styles.caret, { backgroundColor: colors.primary }]}
              />
            ) : null}
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={editable}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoCorrect={false}
        caretHidden
        contextMenuHidden={false}
        maxLength={CODE_LENGTH}
        returnKeyType="done"
        style={[
          styles.input,
          { fontFamily: sansFamily('400'), fontSize: scaleFont(16, fontScale) },
        ]}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  digit: {
    textAlign: 'center',
  },
  caret: {
    position: 'absolute',
    width: 2,
    height: 22,
    borderRadius: 1,
  },
  input: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
    color: 'transparent',
  },
});
