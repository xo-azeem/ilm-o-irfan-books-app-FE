import type { PropsWithChildren } from 'react';
import {
  Pressable,
  Text as RNText,
  View,
  type PressableProps,
} from 'react-native';

type ButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary';
};

export function Button({
  label,
  variant = 'primary',
  className,
  ...props
}: ButtonProps) {
  const variantClassName =
    variant === 'primary'
      ? 'bg-brand-600 active:bg-brand-700'
      : 'border border-slate-300 bg-white active:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:active:bg-slate-700';

  const labelClassName =
    variant === 'primary'
      ? 'text-white'
      : 'text-slate-900 dark:text-slate-100';

  return (
    <Pressable
      accessibilityRole="button"
      className={`rounded-xl px-5 py-3 ${variantClassName} ${className ?? ''}`}
      {...props}>
      <RNText className={`text-center text-base font-semibold ${labelClassName}`}>
        {label}
      </RNText>
    </Pressable>
  );
}

type TextProps = PropsWithChildren<{
  className?: string;
}>;

export function Text({ children, className }: TextProps) {
  return (
    <RNText className={`text-slate-900 dark:text-slate-100 ${className ?? ''}`}>
      {children}
    </RNText>
  );
}

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ children, className }: CardProps) {
  return (
    <View
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className ?? ''}`}>
      {children}
    </View>
  );
}
