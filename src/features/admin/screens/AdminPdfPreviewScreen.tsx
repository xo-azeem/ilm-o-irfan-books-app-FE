import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import Pdf from 'react-native-pdf';

import { Screen } from '@/components/layout';
import { Display, Text } from '@/components/ui';
import { AdminBackLink } from '@/features/admin/components/AdminUi';
import type { AdminBooksStackParamList } from '@/features/admin/navigation/types';
import { getSignedPdfUrl } from '@/lib/supabase';

export function AdminPdfPreviewScreen() {
  const route = useRoute<RouteProp<AdminBooksStackParamList, 'AdminPdfPreview'>>();
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getSignedPdfUrl(route.params.bookId)
      .then(result => {
        if (active) setUri(result.url);
      })
      .catch(caught => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Could not load PDF.');
        }
      });
    return () => {
      active = false;
    };
  }, [route.params.bookId]);

  return (
    <Screen scrollable={false} padding={0}>
      <View style={s.header}>
        <AdminBackLink />
        <Display size={19} style={s.title}>
          {route.params.title}
        </Display>
      </View>
      {error ? (
        <Text size={15} leading={1.5} tone="muted" style={s.error}>{error}</Text>
      ) : uri ? (
        <Pdf source={{ uri, cache: true }} style={styles.pdf} />
      ) : (
        <ActivityIndicator style={s.loader} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pdf: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

const s = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingTop: 4 },
  title: { marginBottom: 12 },
  error: { paddingHorizontal: 18 },
  loader: { flex: 1 },
});
