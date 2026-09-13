import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import Pdf, { type PdfRef } from 'react-native-pdf';

import { Label, Text } from '@/components/ui';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminBackLink,
  AdminButton,
  AdminErrorState,
  useAdminBottomInset,
} from '@/features/admin/components/AdminUi';
import type { AdminLibraryStackParamList } from '@/features/admin/navigation/types';
import { getSignedPdfUrl } from '@/lib/supabase';
import { readerStages } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Which step failed. The link is a call to our own function; the render is
 * the viewer fetching and drawing the file behind it. They fail for different
 * reasons, and the operator should be told which one it was.
 */
type PreviewError = { stage: 'link' | 'render'; detail: string };

/**
 * The PDF check before publishing.
 *
 * The page an operator most wants to see is not page one — it is somewhere in
 * the middle, where a bad scan or a wrong file shows itself. The scrubber is
 * therefore the main control, and it is tappable along its whole length.
 *
 * The document view reloads the whole file whenever one of its props changes
 * (see `BookPageFlip`), so nothing it is handed may move while the operator
 * scrolls: the page it reports is kept in state for the label and the
 * scrubber but never fed back in as `page`, a scrubber jump goes through the
 * imperative `setPage` command instead, and the source, callbacks and style
 * are all held stable across renders.
 */
export function AdminPdfPreviewScreen() {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<AdminLibraryStackParamList, 'AdminPdfPreview'>>();
  const { colors, isDark } = useTheme();
  const bottomInset = useAdminBottomInset();

  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<PreviewError | null>(null);
  /** The page under the operator's eye, as the document view reports it. */
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const trackWidth = useRef(0);
  const pdfRef = useRef<PdfRef>(null);

  // Held against the link, so a re-render does not hand the viewer a new
  // source object and have it fetch the file again.
  const source = useMemo(() => (uri ? { uri, cache: true } : null), [uri]);

  const handleLoadComplete = useCallback(
    (count: number) => setPageCount(count),
    [],
  );
  const handlePageChanged = useCallback((next: number) => setPage(next), []);
  const handleRenderError = useCallback(
    (caught: object) =>
      setError({
        stage: 'render',
        detail: errorMessage(caught, 'This file could not be rendered.'),
      }),
    [],
  );

  const load = useCallback(() => {
    setError(null);
    // A retry after a render failure asks for a fresh link rather than
    // handing the viewer the same one that just failed.
    setUri(null);
    void getSignedPdfUrl(route.params.bookId)
      .then(result => setUri(result.url))
      .catch(caught =>
        setError({
          stage: 'link',
          detail: errorMessage(caught, 'Could not open this PDF.'),
        }),
      );
  }, [route.params.bookId]);

  useEffect(() => {
    load();
  }, [load]);

  const onTrackLayout = useCallback((event: LayoutChangeEvent) => {
    trackWidth.current = event.nativeEvent.layout.width;
  }, []);

  const scrubTo = useCallback(
    (x: number) => {
      if (pageCount === 0 || trackWidth.current === 0) {
        return;
      }
      const share = Math.max(0, Math.min(1, x / trackWidth.current));
      const target = Math.max(1, Math.round(share * pageCount));
      // The knob moves at once; the document view follows through the
      // command and then reports where it landed, which resyncs `page`.
      setPage(target);
      pdfRef.current?.setPage(target);
    },
    [pageCount],
  );

  const progress = pageCount > 0 ? (page - 1) / Math.max(1, pageCount - 1) : 0;

  return (
    <SafeAreaView
      style={[
        styles.root,
        { backgroundColor: isDark ? readerStages.dark : readerStages.light },
      ]}
      edges={['top', 'left', 'right']}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.chrome,
            borderBottomColor: colors.chromeBorder,
          },
        ]}
      >
        <AdminBackLink label="Files" />
        <Label size={11.5} leading={1} weight="400" tracking={0.6} tone="muted">
          {pageCount > 0 ? `Page ${page} / ${pageCount}` : route.params.title}
        </Label>
        <View style={styles.barSpacer} />
      </View>

      {error ? (
        <View style={styles.centre}>
          <AdminErrorState
            title="Couldn't open this file"
            message={
              error.stage === 'link'
                ? 'The signed link did not come back, so nothing could be rendered.'
                : 'The signed link came back, but the file behind it could not be fetched or rendered.'
            }
            detail={error.detail}
            onRetry={load}
            secondaryLabel="Back to the editor"
            onSecondary={() => navigation.goBack()}
          />
        </View>
      ) : source ? (
        <Pdf
          ref={pdfRef}
          source={source}
          // Where the file opens — and the only value this prop ever takes.
          // Feeding the reported page back in here reloaded the document on
          // every page the operator scrolled past.
          page={1}
          // This is the one place a remote URL goes straight into the viewer,
          // so the viewer's own downloader runs — and that downloader is
          // react-native-blob-util. The viewer's default `trustAllCerts` sets
          // its `trusty` flag, which in 0.24 means "use the trust manager the
          // app registered natively"; none is, so the request throws before a
          // byte moves ("ReactNativeBlobUtil request error"). The signed URL
          // is on Supabase Storage behind a public certificate; the platform's
          // trust store is the right one. See `downloadToPath` in services/pdf.
          trustAllCerts={false}
          onLoadComplete={handleLoadComplete}
          onPageChanged={handlePageChanged}
          onError={handleRenderError}
          style={styles.pdf}
        />
      ) : (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.primary} />
          <Text size={12.5} leading={1.45} tone="muted">
            Fetching a signed link…
          </Text>
        </View>
      )}

      {uri && !error ? (
        <View
          style={[
            styles.panel,
            {
              // Floats above the tab bar, not under it.
              bottom: bottomInset + 12,
              backgroundColor: colors.tabBarSurface,
              borderColor: colors.tabBarBorder,
            },
          ]}
        >
          <View style={styles.scrub}>
            <Label size={11} leading={1} weight="400" tracking={0} tone="faint">
              1
            </Label>

            <Pressable
              accessibilityRole="adjustable"
              accessibilityLabel={`Page ${page} of ${pageCount}`}
              onLayout={onTrackLayout}
              onPress={event => scrubTo(event.nativeEvent.locationX)}
              hitSlop={12}
              style={styles.trackHit}
            >
              <View
                style={[styles.track, { backgroundColor: colors.tabBarBorder }]}
              >
                <View
                  style={[
                    styles.trackFill,
                    {
                      width: `${progress * 100}%`,
                      backgroundColor: colors.primaryBright,
                    },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.knob,
                  {
                    left: `${progress * 100}%`,
                    backgroundColor: colors.primaryBright,
                    borderColor: colors.surface,
                  },
                ]}
              />
            </Pressable>

            <Label size={11} leading={1} weight="400" tracking={0} tone="faint">
              {String(pageCount || '—')}
            </Label>
          </View>

          <View style={styles.actions}>
            <View style={styles.grow}>
              <AdminButton
                label="Looks wrong — replace"
                variant="secondary"
                compact
                onPress={() => navigation.goBack()}
              />
            </View>
            <View style={styles.grow}>
              <AdminButton
                label="Looks right"
                compact
                onPress={() => navigation.goBack()}
              />
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  barSpacer: {
    width: 56,
  },
  pdf: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: ADMIN_GUTTER,
  },
  panel: {
    position: 'absolute',
    left: 12,
    right: 12,
    gap: 11,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  scrub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackHit: {
    flex: 1,
    justifyContent: 'center',
    height: 16,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
  },
  knob: {
    position: 'absolute',
    top: 1,
    width: 14,
    height: 14,
    marginLeft: -7,
    borderRadius: 7,
    borderWidth: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 9,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
});
