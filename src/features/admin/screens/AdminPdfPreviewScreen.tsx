import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import Pdf from 'react-native-pdf';

import { Screen } from '@/components/layout';
import { Text } from '@/components/ui';
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
    <Screen scrollable={false} contentContainerClassName="px-0">
      <View className="px-5 pt-1">
        <AdminBackLink />
        <Text className="mb-3 px-1 text-[17px] font-semibold text-app-ink dark:text-app-ink-dark">
          {route.params.title}
        </Text>
      </View>
      {error ? (
        <Text className="px-5 text-[15px] text-app-muted dark:text-app-muted-dark">{error}</Text>
      ) : uri ? (
        <Pdf source={{ uri, cache: true }} style={styles.pdf} />
      ) : (
        <ActivityIndicator className="flex-1" />
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
