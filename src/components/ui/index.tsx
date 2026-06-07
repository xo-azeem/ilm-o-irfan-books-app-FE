import type { PropsWithChildren } from 'react';
import { Text as RNText } from 'react-native';

type TextProps = PropsWithChildren<{
  className?: string;
  numberOfLines?: number;
}>;

export function Text({ children, className, numberOfLines }: TextProps) {
  return (
    <RNText
      numberOfLines={numberOfLines}
      className={`text-ios-label dark:text-ios-label-dark ${className ?? ''}`}>
      {children}
    </RNText>
  );
}
