import type { PropsWithChildren } from 'react';
import { Text as RNText, type TextStyle } from 'react-native';

type TextProps = PropsWithChildren<{
  className?: string;
  numberOfLines?: number;
  style?: TextStyle;
}>;

const bodyBase = 'font-sans tracking-snug text-app-ink dark:text-app-ink-dark';
const headingBase =
  'font-sans font-semibold tracking-sleek text-app-ink dark:text-app-ink-dark';

export function Text({ children, className, numberOfLines, style }: TextProps) {
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={style}
      className={`${bodyBase} ${className ?? ''}`}>
      {children}
    </RNText>
  );
}

/** Headings — same DM Sans family, tighter tracking and semibold weight. */
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
      className={`${headingBase} ${className ?? ''}`}>
      {children}
    </RNText>
  );
}
