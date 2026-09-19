import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type BlurEvent,
  type FocusEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputProps,
  type TextInputSubmitEditingEventData,
  type ViewStyle,
} from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';

import { Icon } from '@/components/ui/Icon';
import { Label, Text } from '@/components/ui/Text';
import { radius } from '@/theme/palette';
import { fonts, fontSize, sansFamily, scaleFont } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';
import { useStrings } from '@/i18n';

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
export const Field = memo(function Field({
  label,
  hint,
  error,
  children,
  style,
}: FieldProps) {
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
  const { colors, fontScale } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

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

  // The drawn pill is 50pt tall but the input inside it is only as tall as one
  // line of text, so a tap anywhere else in the row would land on dead space.
  // The row itself carries the press and hands focus to the input.
  const focusInput = useCallback(() => {
    if (editable) {
      inputRef.current?.focus();
    }
  }, [editable]);

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
      <Pressable
        accessible={false}
        onPress={focusInput}
        style={[styles.box, boxStyle]}
      >
        <TextInput
          ref={inputRef}
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
              // A TextInput is not a `Text`, so the app-wide size is applied
              // here by hand — otherwise a field's label would grow and the
              // value the reader types into it would not.
              fontSize: scaleFont(
                mono ? fontSize.caption + 0.5 : fontSize.body,
                fontScale,
              ),
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
          {...rest}
        />
        {trailing}
      </Pressable>
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
          {
            backgroundColor: colors.background,
            borderColor: colors.borderSoft,
          },
        ]}
      >
        <Text
          size={mono ? fontSize.caption + 0.5 : fontSize.body}
          leading={1.2}
          tone="muted"
          style={mono ? { fontFamily: fonts.mono } : undefined}
        >
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
  placeholder,
}: {
  label?: string;
  value?: string;
  onPress?: () => void;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  const s = useStrings();

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
        ]}
      >
        <Text
          size={fontSize.body}
          leading={1.2}
          tone={value ? 'ink' : 'faint'}
          style={styles.grow}
        >
          {value ?? placeholder ?? s.common.select}
        </Text>
        <Icon icon={ChevronDown} size={13} tone="faint" strokeWidth={2} />
      </Pressable>
    </Field>
  );
});

/**
 * How long the field waits after the last keystroke before it reports a term
 * that goes to the server.
 */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * The shorter wait for a term that only narrows a list already in memory —
 * long enough to skip the intermediate keystrokes, short enough to feel live.
 */
export const LOCAL_SEARCH_DEBOUNCE_MS = 120;

export type SearchFieldProps = Omit<
  TextInputProps,
  'style' | 'value' | 'defaultValue' | 'onChangeText'
> & {
  /**
   * The text, when the caller owns it. Leave it out and the field keeps its
   * own — a screen that only needs the term then never re-renders on a
   * keystroke, only when `onSearch` fires.
   */
  value?: string;
  /** The starting text of a field that keeps its own. */
  defaultValue?: string;
  /** Every keystroke, untrimmed. */
  onChangeText?: (text: string) => void;
  /**
   * The trimmed term, `debounceMs` after it last changed — and at once on
   * submit and on clear. Fires only when the term differs from the last one
   * reported, so a trailing space is not a new search, and never on mount.
   */
  onSearch?: (term: string) => void;
  debounceMs?: number;
  /** Renders as a static, tappable row instead of a live input. */
  readOnly?: boolean;
  onPress?: () => void;
  /** After the field has emptied itself; the clear is not the caller's to do. */
  onClear?: () => void;
  /** Compact height used across the admin panel. */
  dense?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The search row used on Discover, Help and every admin list.
 *
 * The debounce lives here rather than in each screen, so every list in the
 * app waits the same beat before asking the server and every one of them
 * flushes it the same way: the return key and the clear button both report
 * straight away, because the reader has said what they mean.
 */
export const SearchField = memo(function SearchField({
  value,
  defaultValue = '',
  onChangeText,
  onSearch,
  debounceMs = SEARCH_DEBOUNCE_MS,
  readOnly = false,
  onPress,
  onClear,
  dense = false,
  placeholder,
  onFocus,
  onBlur,
  onSubmitEditing,
  style,
  ...rest
}: SearchFieldProps) {
  const { colors, fontScale } = useTheme();
  const s = useStrings();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Controlled when the caller passes `value`; otherwise the text is ours.
  const [ownText, setOwnText] = useState(defaultValue);
  const controlled = value !== undefined;
  const text = controlled ? value : ownText;

  // The callback is read through a ref so a caller that hands us a new arrow
  // every render neither restarts the timer nor misses the pending report.
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  // The term last handed to `onSearch`. Seeded with the initial text so mount
  // is silent — the caller's own state already holds it.
  const reportedRef = useRef(text.trim());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPending = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const report = useCallback((term: string) => {
    if (term !== reportedRef.current) {
      reportedRef.current = term;
      onSearchRef.current?.(term);
    }
  }, []);

  // Restarted on every change to the text, whichever side owns it — so a
  // suggestion the caller drops into `value` searches just as a keystroke
  // does. Leaving the screen cancels whatever is pending.
  useEffect(() => {
    const term = text.trim();
    if (!onSearchRef.current || term === reportedRef.current) {
      return;
    }
    // An emptied field is never worth waiting on: the whole list is wanted
    // back, and it is usually already cached. Reporting it at once also keeps
    // the record straight when the caller clears `value` from its own button.
    if (!term) {
      report(term);
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      report(term);
    }, debounceMs);
    return cancelPending;
  }, [cancelPending, debounceMs, report, text]);

  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  const handleChange = useCallback(
    (next: string) => {
      if (!controlled) {
        setOwnText(next);
      }
      onChangeText?.(next);
    },
    [controlled, onChangeText],
  );

  const handleSubmit = useCallback(
    (event: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
      cancelPending();
      report(text.trim());
      onSubmitEditing?.(event);
    },
    [cancelPending, onSubmitEditing, report, text],
  );

  const handleClear = useCallback(() => {
    cancelPending();
    if (!controlled) {
      setOwnText('');
    }
    onChangeText?.('');
    report('');
    onClear?.();
  }, [cancelPending, controlled, onChangeText, onClear, report]);

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
      // A fixed height, unlike the other fields' `minHeight` — so it has to be
      // grown deliberately or larger text would be clipped inside it.
      height: Math.round((dense ? 44 : 50) * Math.max(1, fontScale)),
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
    [colors, dense, focused, fontScale],
  );

  const content = (
    <>
      <Icon
        icon={Search}
        size={dense ? 15 : 17}
        tone={focused ? 'primary' : 'faint'}
        strokeWidth={1.9}
      />
      {readOnly ? (
        <Text
          size={dense ? fontSize.caption + 0.5 : fontSize.bodySmall + 0.5}
          leading={1.2}
          tone="faint"
          style={styles.grow}
        >
          {placeholder ?? s.common.search}
        </Text>
      ) : (
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={handleChange}
          placeholder={placeholder ?? s.common.search}
          placeholderTextColor={colors.faint}
          selectionColor={colors.primaryBright}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          style={[
            styles.input,
            {
              color: colors.ink,
              fontFamily: sansFamily('500'),
              fontSize: scaleFont(
                dense ? fontSize.caption + 0.5 : fontSize.bodySmall + 0.5,
                fontScale,
              ),
            },
          ]}
          {...rest}
        />
      )}
      {!readOnly && text ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={s.common.clearSearch}
          hitSlop={8}
          onPress={handleClear}
        >
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
        style={({ pressed }) => [
          styles.box,
          boxStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessible={false}
      onPress={focusInput}
      style={[styles.box, boxStyle, style]}
    >
      {content}
    </Pressable>
  );
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
    // Without this the input is only as tall as its own text and the rest of
    // the 50pt pill is untappable — the row looks like a field but only a thin
    // band in the middle of it takes a tap.
    alignSelf: 'stretch',
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
