import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BookCover, EmptyState } from '@/components/ui';
import { readerStage } from '@/theme/palette';

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
  return (
    <View style={[styles.root, { backgroundColor: readerStage }]}>
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
