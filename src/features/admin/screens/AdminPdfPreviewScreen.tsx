import { useCallback, useEffect, useRef, useState } from 'react';
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
import Pdf from 'react-native-pdf';

import { Label, Text } from '@/components/ui';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminBackLink,
  AdminButton,
  AdminErrorState,
} from '@/features/admin/components/AdminUi';
import type { AdminLibraryStackParamList } from '@/features/admin/navigation/types';
import { getSignedPdfUrl } from '@/lib/supabase';
import { readerStages } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The PDF check before publishing.
 *
 * The page an operator most wants to see is not page one — it is somewhere in
 * the middle, where a bad scan or a wrong file shows itself. The scrubber is
 * therefore the main control, and it is tappable along its whole length.
 */
export function AdminPdfPreviewScreen() {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<AdminLibraryStackParamList, 'AdminPdfPreview'>>();
  const { colors, isDark } = useTheme();

  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const trackWidth = useRef(0);

  const load = useCallback(() => {
    setError(null);
    void getSignedPdfUrl(route.params.bookId)
      .then(result => setUri(result.url))
      .catch(caught =>
        setError(errorMessage(caught, 'Could not open this PDF.')),
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
      setPage(Math.max(1, Math.round(share * pageCount)));
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
            message="The signed link did not come back, so nothing could be rendered."
            detail={error}
            onRetry={load}
            secondaryLabel="Back to the editor"
            onSecondary={() => navigation.goBack()}
          />
        </View>
      ) : uri ? (
        <Pdf
          source={{ uri, cache: true }}
          page={page}
          onLoadComplete={count => setPageCount(count)}
          onPageChanged={next => setPage(next)}
          onError={caught =>
            setError(errorMessage(caught, 'This file could not be rendered.'))
          }
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
    bottom: 12,
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
