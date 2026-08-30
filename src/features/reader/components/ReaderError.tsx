import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BookCover, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The reader's failure state.
 *
 * It never shows a stack trace. It says what happened, confirms the reader's
 * place was not lost, and offers one useful escape.
 */
export const ReaderError = memo(function ReaderError({
  page,
  message,
  onRetry,
  onReadDownloaded,
}: {
  /** The last page the reader reached, so they know nothing was lost. */
  page?: number;
  /** Only shown when it says something a reader can act on. */
  message?: string;
  onRetry: () => void;
  onReadDownloaded?: () => void;
}) {
  // The failure state keeps the app's own palette: its copy is app-themed, and
  // page-tone paper under app-dark ink would be a message nobody can read.
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <EmptyState
        art={<BookCover width={88} height={130} placeholder rounded={9} />}
        title="This page didn’t arrive."
        message={
          message ??
          (page
            ? `Your place is saved at page ${page}. Check your connection and try again.`
            : 'Your place is saved. Check your connection and try again.')
        }
        action={{ label: 'Try again', onPress: onRetry }}
        secondaryAction={
          onReadDownloaded
            ? { label: 'Read downloaded pages', onPress: onReadDownloaded }
            : undefined
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
});
