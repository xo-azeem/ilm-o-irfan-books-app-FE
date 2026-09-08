import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  Book,
  BookMarked,
  Globe,
  Landmark,
  Scale,
  ScrollText,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';

import { Icon, Text } from '@/components/ui';
import { AdminColorField, AdminConfirmSheet } from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminBackLink,
  AdminButton,
  AdminEyebrow,
  AdminField,
  AdminLabel,
  AdminScreenTitle,
  AdminTag,
  AdminTextAction,
} from '@/features/admin/components/AdminUi';
import { useDirtyTracker, useUnsavedGuard } from '@/features/admin/hooks/useAdminForm';
import { useAppInsets } from '@/hooks/useAppInsets';
import { useAdminCategories, useDeleteAdminCategory, useSaveAdminCategory } from '@/hooks/useAdmin';
import { CATEGORY_ICON_KEYS, slugify } from '@/services/admin';
import { palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminLibraryStackParamList } from '../navigation/types';

/** Only these keys have a matching glyph in the reader app. */
const ICONS: Record<string, LucideIcon> = {
  'book-marked': BookMarked,
  book: Book,
  sparkles: Sparkles,
  landmark: Landmark,
  scale: Scale,
  'scroll-text': ScrollText,
  globe: Globe,
};

const ORDINALS = ['1st', '2nd', '3rd'];

function ordinal(position: number): string {
  return ORDINALS[position - 1] ?? `${position}th`;
}

/**
 * A category.
 *
 * The editor leads with the thing an operator is actually deciding — how the
 * tile will look on Explore — rather than with the fields that produce it, so
 * the icon and label are judged together instead of imagined apart.
 */
export function AdminCategoryEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AdminLibraryStackParamList, 'AdminCategoryEditor'>>();
  const categoryId = route.params?.categoryId;
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
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
    accentDark: palette.greenBright as string,
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
      accentDark: existing.accent_dark ?? existing.accent ?? palette.greenBright,
    });
  }, [existing]);

  useEffect(() => {
    if (!categoryId || existing) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, existing]);

  const resolvedSlug = form.slug.trim() || slugify(form.label);
  const books = existing?.book_count ?? 0;

  const position = useMemo(() => {
    const index = categories.findIndex(item => item.id === categoryId);
    return index >= 0 ? index + 1 : null;
  }, [categories, categoryId]);

  const PreviewIcon = ICONS[form.iconKey] ?? BookMarked;

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
        // Order is a merchandising decision made on the list, where the whole
        // Explore row is visible — never blind, from inside one record.
        sort_order: existing?.sort_order ?? categories.length,
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
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink
          label="Categories"
          action={isDirty ? <AdminTag label="UNSAVED" tone="warning" /> : undefined}
        />
      </View>

      <ScrollView
        style={styles.grow}
        contentContainerStyle={{
          paddingHorizontal: ADMIN_GUTTER,
          paddingTop: 16,
          paddingBottom: scrollEndPadding + 80,
          gap: 17,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <AdminScreenTitle
          title={form.label || (categoryId ? 'Edit category' : 'New category')}
          subtitle={
            categoryId
              ? `${books} ${books === 1 ? 'book' : 'books'}${
                  position ? ` · shown ${ordinal(position)} on Explore` : ''
                }`
              : 'A tile on Explore and a filter in search.'
          }
        />

        {/* What the operator is actually deciding, shown as readers will see it. */}
        <View
          style={[
            styles.preview,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          ]}>
          <AdminEyebrow>How readers see it</AdminEyebrow>
          <View
            style={[
              styles.previewTile,
              { backgroundColor: colors.surface, borderColor: colors.borderSoft },
            ]}>
            <View style={[styles.previewIcon, { backgroundColor: `${form.accent}33` }]}>
              <Icon icon={PreviewIcon} size={16} color={form.accent} strokeWidth={1.9} />
            </View>
            <View style={styles.grow}>
              <Text size={14} leading={1.2} weight="500" numberOfLines={1}>
                {form.label || 'Category'}
              </Text>
              <Text size={11} leading={1.2} tone="muted">
                {`${books} ${books === 1 ? 'book' : 'books'}`}
              </Text>
            </View>
          </View>
        </View>

        <AdminField
          label="Label"
          value={form.label}
          onChangeText={value => setForm(current => ({ ...current, label: value }))}
          maxLength={40}
        />

        <View style={styles.block}>
          <AdminLabel>Icon</AdminLabel>
          <View style={styles.iconGrid}>
            {CATEGORY_ICON_KEYS.map(key => {
              const Glyph = ICONS[key] ?? BookMarked;
              const selected = form.iconKey === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={key}
                  onPress={() => setForm(current => ({ ...current, iconKey: key }))}
                  style={({ pressed }) => [
                    styles.iconTile,
                    {
                      backgroundColor: selected ? colors.primaryFill : colors.control,
                      borderColor: selected ? colors.selectedBorder : 'transparent',
                    },
                    pressed && styles.pressed,
                  ]}>
                  <Icon
                    icon={Glyph}
                    size={17}
                    tone={selected ? 'action' : 'muted'}
                    strokeWidth={1.9}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <AdminField
          label="URL key"
          value={form.slug}
          onChangeText={value => setForm(current => ({ ...current, slug: value }))}
          placeholder={slugify(form.label) || 'auto-from-label'}
          autoCapitalize="none"
          mono
          helper={`Currently “${resolvedSlug || '—'}”.`}
        />

        <AdminColorField
          label="Accent"
          value={form.accent}
          onChange={value => setForm(current => ({ ...current, accent: value }))}
          helper="Tints the tile on Explore."
        />
        <AdminColorField
          label="Accent (dark mode)"
          value={form.accentDark}
          onChange={value => setForm(current => ({ ...current, accentDark: value }))}
        />

        {categoryId ? (
          <View style={styles.deleteBlock}>
            <AdminTextAction
              label={
                books > 0
                  ? `Delete — ${books} ${books === 1 ? 'book loses' : 'books lose'} this tag`
                  : 'Delete this category'
              }
              destructive
              size={13}
              onPress={() => setConfirmDelete(true)}
            />
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.chrome, borderTopColor: colors.chromeBorder },
        ]}>
        <AdminButton
          label={categoryId ? 'Save category' : 'Create category'}
          loading={save.isPending}
          disabled={!form.label.trim()}
          onPress={handleSave}
        />
      </View>

      <AdminConfirmSheet
        visible={confirmDelete}
        title={`Delete ${form.label || 'this category'}?`}
        message="The books themselves are kept. What goes:"
        consequences={[
          `The tag on ${books} ${books === 1 ? 'book' : 'books'}`,
          'Its tile on Explore and its filter in search',
        ]}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  grow: { flex: 1, minWidth: 0 },
  preview: {
    gap: 11,
    padding: 15,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  previewTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  previewIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: { gap: 9 },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  deleteBlock: {
    alignItems: 'center',
    paddingTop: 4,
  },
  footer: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 13,
    paddingBottom: 26,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  pressed: { opacity: 0.72 },
});
