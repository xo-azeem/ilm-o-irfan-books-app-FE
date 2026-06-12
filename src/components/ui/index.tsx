import type { PropsWithChildren } from 'react';
import { Text as RNText, type TextStyle } from 'react-native';

type TextProps = PropsWithChildren<{
  className?: string;
  numberOfLines?: number;
  style?: TextStyle;
}>;

export function Text({ children, className, numberOfLines, style }: TextProps) {
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={style}
      className={`font-sans text-app-ink dark:text-app-ink-dark ${className ?? ''}`}>
      {children}
    </RNText>
  );
}

export function DisplayText({
  children,
  className,
  numberOfLines,
  style,
}: TextProps) {
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={style}
      className={`font-display text-app-ink dark:text-app-ink-dark ${className ?? ''}`}>
      {children}
    </RNText>
  );
}
