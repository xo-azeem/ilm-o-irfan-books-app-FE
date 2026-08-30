import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type BlurEvent,
  type FocusEvent,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';

import { Icon } from '@/components/ui/Icon';
import { Label, Text } from '@/components/ui/Text';
import { radius } from '@/theme/palette';
import { fonts, fontSize, sansFamily } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Inputs.
 *
 * A focused field gets a green rim and a soft outer wash rather than a jumpy
 * border-width change, so the row never shifts as you tab through a form.
 */

export type FieldProps = {
  label?: string;
  /** Rendered under the field — helper copy or a validation message. */
  hint?: string;
  error?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Wraps any control with the standard mono label and hint slots. */
export const Field = memo(function Field({ label, hint, error, children, style }: FieldProps) {
  return (
    <View style={[styles.field, style]}>
      {label ? <Label size={fontSize.labelSmall + 0.5}>{label}</Label> : null}
      {children}
      {error ? (
        <Text size={fontSize.captionSmall} leading={1.4} tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text size={fontSize.captionSmall} leading={1.4} tone="faint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  hint?: string;
  error?: string;
  /** Trailing affordance — a "Show" toggle, a unit, a verified marker. */
  trailing?: ReactNode;
  /** Multiline fields grow to this height instead of the standard row. */
  height?: number;
  /** Slugs and file paths read better in the mono face. */
  mono?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export const TextField = memo(function TextField({
  label,
  hint,
  error,
  trailing,
  height,
  mono = false,
  editable = true,
  multiline,
  onFocus,
  onBlur,
  containerStyle,
  ...rest
}: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const handleFocus = useCallback(
    (event: FocusEvent) => {
      setFocused(true);
      onFocus?.(event);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (event: BlurEvent) => {
      setFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  const boxStyle = useMemo<ViewStyle>(() => {
    const isFocused = focused && editable;
    return {
      minHeight: height ?? 50,
      borderRadius: radius.field,
      paddingHorizontal: 15,
      paddingVertical: multiline ? 11 : 0,
      backgroundColor: !editable
        ? colors.surfaceAlt
        : isFocused
        ? colors.focus
        : colors.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: error
        ? colors.dangerBorder
        : isFocused
        ? colors.focusBorder
        : colors.border,
      // The focus wash — a wide, very soft shadow rather than a second border.
      ...(isFocused
        ? {
            shadowColor: colors.primary,
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
            elevation: 2,
          }
        : null),
    };
  }, [colors, editable, error, focused, height, multiline]);

  return (
    <Field label={label} hint={hint} error={error} style={containerStyle}>
      <View style={[styles.box, boxStyle]}>
        <TextInput
          editable={editable}
          multiline={multiline}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.faint}
          selectionColor={colors.primaryBright}
          style={[
            styles.input,
            {
              color: editable ? colors.ink : colors.muted,
              fontFamily: mono ? fonts.mono : sansFamily('400'),
              fontSize: mono ? fontSize.caption + 0.5 : fontSize.body,
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
          {...rest}
        />
        {trailing}
      </View>
    </Field>
  );
});

/**
 * A field that displays a value the reader cannot edit here — a verified email,
 * a computed slug. Visually recessed so it reads as a fact, not a control.
 */
export const ReadOnlyField = memo(function ReadOnlyField({
  label,
  value,
  note,
  mono = false,
}: {
  label?: string;
  value: string;
  /** Right-aligned marker, e.g. "Verified". */
  note?: string;
  mono?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Field label={label}>
      <View
        style={[
          styles.box,
          styles.readOnly,
          { backgroundColor: colors.background, borderColor: colors.borderSoft },
        ]}>
        <Text
          size={mono ? fontSize.caption + 0.5 : fontSize.body}
          leading={1.2}
          tone="muted"
          style={mono ? { fontFamily: fonts.mono } : undefined}>
          {value}
        </Text>
        {note ? (
          <Text size={fontSize.label} leading={1} weight="500" tone="faint">
            {note}
          </Text>
        ) : null}
      </View>
    </Field>
  );
});

/** A field that opens a picker rather than a keyboard. */
export const SelectField = memo(function SelectField({
  label,
  value,
  onPress,
  placeholder = 'Select',
}: {
  label?: string;
  value?: string;
  onPress?: () => void;
  placeholder?: string;
}) {
  const { colors } = useTheme();

  return (
    <Field label={label}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.box,
          {
            minHeight: 50,
            borderRadius: radius.field,
            paddingHorizontal: 15,
            backgroundColor: colors.surfaceAlt,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: colors.border,
          },
          pressed && styles.pressed,
        ]}>
        <Text size={fontSize.body} leading={1.2} tone={value ? 'ink' : 'faint'} style={styles.grow}>
          {value ?? placeholder}
        </Text>
        <Icon icon={ChevronDown} size={13} tone="faint" strokeWidth={2} />
      </Pressable>
    </Field>
  );
});

export type SearchFieldProps = Omit<TextInputProps, 'style'> & {
  /** Renders as a static, tappable row instead of a live input. */
  readOnly?: boolean;
  onPress?: () => void;
  onClear?: () => void;
  /** Compact height used across the admin panel. */
  dense?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** The search row used on Discover, Help and every admin list. */
export const SearchField = memo(function SearchField({
  readOnly = false,
  onPress,
  onClear,
  dense = false,
  value,
  placeholder = 'Search',
  onFocus,
  onBlur,
  style,
  ...rest
}: SearchFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const handleFocus = useCallback(
    (event: FocusEvent) => {
      setFocused(true);
      onFocus?.(event);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (event: BlurEvent) => {
      setFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  const boxStyle = useMemo<ViewStyle>(
    () => ({
      height: dense ? 44 : 50,
      borderRadius: dense ? radius.control : radius.button,
      paddingHorizontal: dense ? 13 : 15,
      gap: dense ? 10 : 11,
      backgroundColor: focused ? colors.focus : colors.surface,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: focused ? colors.focusBorder : colors.border,
      ...(focused
        ? {
            shadowColor: colors.primary,
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
            elevation: 2,
          }
        : null),
    }),
    [colors, dense, focused],
  );

  const content = (
    <>
      <Icon icon={Search} size={dense ? 15 : 17} tone={focused ? 'primary' : 'faint'} strokeWidth={1.9} />
      {readOnly ? (
        <Text size={dense ? fontSize.caption + 0.5 : fontSize.bodySmall + 0.5} leading={1.2} tone="faint" style={styles.grow}>
          {placeholder}
        </Text>
      ) : (
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          selectionColor={colors.primaryBright}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            {
              color: colors.ink,
              fontFamily: sansFamily('500'),
              fontSize: dense ? fontSize.caption + 0.5 : fontSize.bodySmall + 0.5,
            },
          ]}
          {...rest}
        />
      )}
      {onClear && value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={onClear}>
          <Icon icon={X} size={15} tone="faint" strokeWidth={2} />
        </Pressable>
      ) : null}
    </>
  );

  if (readOnly) {
    return (
      <Pressable
        accessibilityRole="search"
        onPress={onPress}
        style={({ pressed }) => [styles.box, boxStyle, pressed && styles.pressed, style]}>
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.box, boxStyle, style]}>{content}</View>;
});

const styles = StyleSheet.create({
  field: {
    gap: 7,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  readOnly: {
    minHeight: 50,
    borderRadius: radius.field,
    paddingHorizontal: 15,
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: 'space-between',
  },
  input: {
    flex: 1,
    padding: 0,
    // A fixed line height keeps single-line fields from growing on Android.
    includeFontPadding: false,
  },
  grow: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
