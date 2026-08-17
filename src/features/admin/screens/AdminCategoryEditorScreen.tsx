import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { Screen, ScreenHeader } from '@/components/layout';
import {
  AdminBackLink,
  AdminField,
  AdminPrimaryButton,
  AdminScreenBlock,
} from '@/features/admin/components/AdminUi';
import type { AdminCatalogStackParamList } from '@/features/admin/navigation/types';
import { useAdminCategories, useDeleteAdminCategory, useSaveAdminCategory } from '@/hooks/useAdmin';
import { slugify } from '@/services/admin';
import { palette } from '@/theme/palette';

export function AdminCategoryEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AdminCatalogStackParamList, 'AdminCategoryEditor'>>();
  const categoryId = route.params?.categoryId;
  const { data: categories = [] } = useAdminCategories();
  const existing = categories.find(item => item.id === categoryId);
  const save = useSaveAdminCategory();
  const remove = useDeleteAdminCategory();

  const [label, setLabel] = useState('');
  const [slug, setSlug] = useState('');
  const [iconKey, setIconKey] = useState('book-marked');
  const [accent, setAccent] = useState(palette.green as string);
  const [sortOrder, setSortOrder] = useState('0');

  useEffect(() => {
    if (!existing) return;
    setLabel(existing.label);
    setSlug(existing.slug);
    setIconKey(existing.icon_key);
    setAccent(existing.accent ?? palette.green);
    setSortOrder(String(existing.sort_order));
  }, [existing]);

  return (
    <Screen>
      <AdminBackLink />
      <ScreenHeader title={categoryId ? 'Edit category' : 'New category'} />
      <AdminScreenBlock>
        <AdminField label="Label" value={label} onChangeText={setLabel} />
        <AdminField
          label="Slug"
          value={slug}
          onChangeText={setSlug}
          placeholder={slugify(label)}
          autoCapitalize="none"
        />
        <AdminField label="Icon key" value={iconKey} onChangeText={setIconKey} autoCapitalize="none" />
        <AdminField label="Accent" value={accent} onChangeText={setAccent} autoCapitalize="none" />
        <AdminField
          label="Sort order"
          value={sortOrder}
          onChangeText={setSortOrder}
          keyboardType="number-pad"
        />
        <AdminPrimaryButton
          label={save.isPending ? 'Saving…' : 'Save'}
          disabled={save.isPending || !label.trim()}
          onPress={() =>
            save.mutate(
              {
                id: categoryId,
                label,
                slug: slug || slugify(label),
                icon_key: iconKey,
                accent,
                accent_dark: accent,
                sort_order: Number(sortOrder) || 0,
              },
              {
                onSuccess: () => navigation.goBack(),
                onError: error =>
                  Alert.alert('Save failed', error instanceof Error ? error.message : 'Try again.'),
              },
            )
          }
        />
        {categoryId ? (
          <AdminPrimaryButton
            label="Delete category"
            destructive
            onPress={() =>
              Alert.alert('Delete category?', 'Books stay; only the category link is removed.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () =>
                    remove.mutate(categoryId, {
                      onSuccess: () => navigation.goBack(),
                      onError: error =>
                        Alert.alert(
                          'Delete failed',
                          error instanceof Error ? error.message : 'Try again.',
                        ),
                    }),
                },
              ])
            }
          />
        ) : null}
      </AdminScreenBlock>
    </Screen>
  );
}
