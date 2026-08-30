import { memo, useCallback, useState } from 'react';
import type { TextInputProps } from 'react-native';

import { TextButton, TextField } from '@/components/ui';

export type AuthFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  /** Adds the Show / Hide control and starts the field masked. */
  secure?: boolean;
};

/**
 * An auth form field. Password fields carry their own reveal toggle rather than
 * an icon, because "Show" is unambiguous and needs no legend.
 */
export const AuthField = memo(function AuthField({
  label,
  error,
  secure = false,
  ...rest
}: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const toggle = useCallback(() => setRevealed(current => !current), []);

  return (
    <TextField
      label={label}
      error={error}
      secureTextEntry={secure && !revealed}
      autoCapitalize="none"
      autoCorrect={false}
      trailing={
        secure ? (
          <TextButton
            label={revealed ? 'Hide' : 'Show'}
            onPress={toggle}
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          />
        ) : undefined
      }
      {...rest}
    />
  );
});
