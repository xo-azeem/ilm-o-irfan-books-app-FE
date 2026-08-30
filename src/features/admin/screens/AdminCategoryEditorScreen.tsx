import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { Screen, ScreenHeader } from '@/components/layout';
import { Text } from '@/components/ui';
import {
  AdminColorField,
  AdminConfirmSheet,
} from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminButton,
  AdminChip,
  AdminField,
  AdminLabel,
} from '@/features/admin/components/AdminUi';
import { useDirtyTracker, useUnsavedGuard } from '@/features/admin/hooks/useAdminForm';
import { useAdminCategories, useDeleteAdminCategory, useSaveAdminCategory } from '@/hooks/useAdmin';
import { CATEGORY_ICON_KEYS, slugify } from '@/services/admin';
import { palette } from '@/theme/palette';

import type { AdminCatalogStackParamList } from '../navigation/types';

export function AdminCategoryEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AdminCatalogStackParamList, 'AdminCategoryEditor'>>();
  const categoryId = route.params?.categoryId;
  const toast = useToast();

  const { data: categories = [] } = useAdminCategories();
  const existing = categories.find(item => item.id === categoryId);
  const save = useSaveAdminCategory();
  const remove = useDeleteAdminCategory();

  const [form, setForm] = useState({
    label: '',
    slug: '',
    iconKey: 'book-marked',
    accent: palette.green as string,
    accentDark: palette.yellowGreen as string,
    sortOrder: '0',
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { isDirty, reset } = useDirtyTracker(form);
  useUnsavedGuard(isDirty);

  useEffect(() => {
    if (!existing) return;
    setForm({
      label: existing.label,
      slug: existing.slug,
      iconKey: existing.icon_key,
      accent: existing.accent ?? palette.green,
      accentDark: existing.accent_dark ?? existing.accent ?? palette.yellowGreen,
      sortOrder: String(existing.sort_order),
    });
  }, [existing]);

  useEffect(() => {
    if (!categoryId || existing) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, existing]);

  const resolvedSlug = form.slug.trim() || slugify(form.label);

  const handleSave = () => {
    if (!form.label.trim()) {
      toast.error('Enter a category label.');
      return;
    }

    save.mutate(
      {
        id: categoryId,
        label: form.label,
        slug: resolvedSlug,
        icon_key: form.iconKey,
        accent: form.accent,
        accent_dark: form.accentDark,
        sort_order: Number(form.sortOrder) || 0,
      },
      {
        onSuccess: () => {
          reset();
          toast.success(categoryId ? 'Category saved.' : 'Category created.');
          navigation.goBack();
        },
        onError: caught => toast.error(errorMessage(caught)),
      },
    );
  };

  return (
    <Screen>
      <AdminBackLink label="Categories" />
      <ScreenHeader
        title={categoryId ? 'Edit category' : 'New category'}
        subtitle={existing ? `${existing.book_count} books assigned` : 'A chip on the Explore row.'}
      />

      <View style={s.stack}>
        <AdminField
          label="Label"
          value={form.label}
          onChangeText={value => setForm(current => ({ ...current, label: value }))}
          maxLength={40}
        />
        <AdminField
          label="Slug"
          value={form.slug}
          onChangeText={value => setForm(current => ({ ...current, slug: value }))}
          placeholder={slugify(form.label) || 'auto-from-label'}
          autoCapitalize="none"
          helper={`Currently “${resolvedSlug || '—'}”.`}
        />

        <View style={s.group}>
          <AdminLabel>Icon</AdminLabel>
          <View style={s.wrap}>
            {CATEGORY_ICON_KEYS.map(key => (
              <AdminChip
                key={key}
                label={key}
                compact
                selected={form.iconKey === key}
                onPress={() => setForm(current => ({ ...current, iconKey: key }))}
              />
            ))}
          </View>
          <Text size={12} leading={1.4} tone="faint">
            Only these keys have a matching icon in the reader app.
          </Text>
        </View>

        <AdminColorField
          label="Accent"
          value={form.accent}
          onChange={value => setForm(current => ({ ...current, accent: value }))}
        />
        <AdminColorField
          label="Accent (dark mode)"
          value={form.accentDark}
          onChange={value => setForm(current => ({ ...current, accentDark: value }))}
        />

        <AdminField
          label="Sort order"
          value={form.sortOrder}
          onChangeText={value =>
            setForm(current => ({ ...current, sortOrder: value.replace(/[^0-9]/g, '') }))
          }
          keyboardType="number-pad"
          helper="Lower numbers appear first. Drag-free reordering lives on the list screen."
        />

        <AdminButton
          label={save.isPending ? 'Saving…' : categoryId ? 'Save changes' : 'Create category'}
          loading={save.isPending}
          disabled={!form.label.trim()}
          onPress={handleSave}
        />

        {categoryId ? (
          <AdminButton
            label="Delete category"
            variant="destructive"
            disabled={remove.isPending}
            onPress={() => setConfirmDelete(true)}
          />
        ) : null}
      </View>

      <AdminConfirmSheet
        visible={confirmDelete}
        title="Delete this category?"
        message="Books keep their data — only the category and its links are removed."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          categoryId &&
          remove.mutate(categoryId, {
            onSuccess: () => {
              setConfirmDelete(false);
              reset();
              toast.success('Category deleted.');
              navigation.goBack();
            },
            onError: caught => {
              setConfirmDelete(false);
              toast.error(errorMessage(caught));
            },
          })
        }
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  stack: { gap: 16 },
  group: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
