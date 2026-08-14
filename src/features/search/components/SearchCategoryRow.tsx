import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Check, ChevronDown, Layers, Search, X } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

import { DisplayText, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import type { CatalogCategory } from '@/services/catalog';

import {
  ExpandableSearchField,
  SEARCH_FIELD_HEIGHT,
  SEARCH_GLASS_BUTTON_SIZE,
  SearchGlassButton,
} from './CollapsibleSearchBar';

const LAYOUT = LinearTransition.duration(260).easing(Easing.bezier(0.22, 1, 0.36, 1));
const ENTER = FadeIn.duration(220).easing(Easing.bezier(0.22, 1, 0.36, 1));
const EXIT = FadeOut.duration(180).easing(Easing.bezier(0.22, 1, 0.36, 1));

/** Title (28) + gap (6) + subtitle (~18) — keeps open/closed rows on the same top edge. */
const HEADING_SLOT_HEIGHT = Math.max(52, SEARCH_GLASS_BUTTON_SIZE, SEARCH_FIELD_HEIGHT);

type Anchor = { x: number; y: number; width: number; height: number };

type CategoryOptionProps = {
  category: CatalogCategory;
  isSelected: boolean;
  isLast: boolean;
  onPress: () => void;
};

const CategoryOption = memo(function CategoryOption({
  category,
  isSelected,
  isLast,
  onPress,
}: CategoryOptionProps) {
  const { isDark, colors } = useTheme();
  const accent = isDark ? category.accentDark : category.accent;
  const Icon = category.icon;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        pressed ? { backgroundColor: colors.fill } : undefined
      }
      className={`flex-row items-center gap-3 px-4 py-3 ${
        !isLast ? 'border-b border-app-border dark:border-app-border-dark' : ''
      }`}>
      <View
        className="h-8 w-8 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: `${accent}${isDark ? '26' : '14'}` }}>
        <Icon size={16} color={accent} strokeWidth={1.75} />
      </View>
      <Text
        className="flex-1 text-[15px] text-app-ink dark:text-app-ink-dark"
        numberOfLines={1}>
        {category.label}
      </Text>
      <Text className="text-[13px] text-app-faint dark:text-app-faint-dark">
        {category.count}
      </Text>
      {isSelected ? (
        <Check size={17} color={colors.primary} strokeWidth={2.5} />
      ) : null}
    </Pressable>
  );
});

type SearchCategorySectionProps = {
  categories: CatalogCategory[];
  searchOpen: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onSearchRowLayout?: (bottomY: number) => void;
};

export const SearchCategorySection = memo(function SearchCategorySection({
  categories,
  searchOpen,
  searchQuery,
  onSearchQueryChange,
  onOpenSearch,
  onCloseSearch,
  onSearchRowLayout,
}: SearchCategorySectionProps) {
  const { isDark, colors } = useTheme();

  const triggerRef = useRef<View>(null);
  const searchRowRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = categories.find(category => category.id === selectedId) ?? null;
  const SelectedIcon = selected?.icon ?? Layers;
  const selectedAccent = selected
    ? isDark
      ? selected.accentDark
      : selected.accent
    : colors.primary;

  const reportSearchRowBottom = useCallback(() => {
    searchRowRef.current?.measureInWindow((_x, y, _w, h) => {
      onSearchRowLayout?.(y + h);
    });
  }, [onSearchRowLayout]);

  useEffect(() => {
    if (!searchOpen) {
      return undefined;
    }
    const timer = setTimeout(reportSearchRowBottom, 32);
    return () => clearTimeout(timer);
  }, [reportSearchRowBottom, searchOpen]);

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  const handleSelect = (id: string | null) => {
    setSelectedId(id);
    setOpen(false);
  };

  return (
    <View>
      <View
        ref={searchRowRef}
        onLayout={reportSearchRowBottom}
        className="mb-6"
        style={{
          height: HEADING_SLOT_HEIGHT,
          justifyContent: 'flex-start',
        }}>
        <Animated.View layout={LAYOUT} style={{ height: HEADING_SLOT_HEIGHT }}>
          {searchOpen ? (
            <Animated.View
              entering={ENTER}
              exiting={EXIT}
              className="flex-row items-center gap-3"
              style={{ height: SEARCH_FIELD_HEIGHT }}>
              <ExpandableSearchField
                value={searchQuery}
                onChangeText={onSearchQueryChange}
              />
              <SearchGlassButton
                accessibilityLabel="Close search"
                onPress={onCloseSearch}
                icon={<X color={colors.primary} size={20} strokeWidth={2} />}
              />
            </Animated.View>
          ) : (
            <Animated.View
              entering={ENTER}
              exiting={EXIT}
              className="flex-row items-start justify-between gap-3"
              style={{ height: HEADING_SLOT_HEIGHT }}>
              <View className="min-w-0 flex-1 gap-1.5">
                <DisplayText className="text-[22px] font-bold leading-7 tracking-tight text-app-ink dark:text-app-ink-dark">
                  Browse Categories
                </DisplayText>
                <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
                  Filter the catalog by topic
                </Text>
              </View>
              <View
                style={{
                  height: SEARCH_FIELD_HEIGHT,
                  justifyContent: 'center',
                }}>
                <SearchGlassButton
                  accessibilityLabel="Open search"
                  onPress={onOpenSearch}
                  icon={<Search color={colors.primary} size={20} strokeWidth={2} />}
                />
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </View>

      <Pressable
        ref={triggerRef}
        onPress={openMenu}
        className="flex-row items-center gap-3 rounded-2xl border border-app-border bg-app-surface px-4 py-3.5 active:opacity-80 dark:border-app-border-dark dark:bg-app-surface-dark">
        <View
          className="h-8 w-8 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: `${selectedAccent}${isDark ? '26' : '14'}` }}>
          <SelectedIcon size={16} color={selectedAccent} strokeWidth={1.75} />
        </View>
        <Text
          className="flex-1 text-[15px] text-app-ink dark:text-app-ink-dark"
          numberOfLines={1}>
          {selected ? selected.label : 'All categories'}
        </Text>
        <ChevronDown color={colors.faint} size={18} strokeWidth={2.25} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1" onPress={() => setOpen(false)}>
          {anchor ? (
            <View
              style={{
                position: 'absolute',
                top: anchor.y + anchor.height + 8,
                left: anchor.x,
                width: anchor.width,
              }}>
              <View
                className="overflow-hidden rounded-2xl border border-app-border bg-app-surface dark:border-app-border-dark dark:bg-app-surface-dark"
                style={{
                  shadowColor: '#0E1410',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: isDark ? 0.4 : 0.16,
                  shadowRadius: 20,
                  elevation: 12,
                }}>
                <ScrollView
                  style={{ maxHeight: 320 }}
                  bounces={false}
                  showsVerticalScrollIndicator={false}>
                  <Pressable
                    onPress={() => handleSelect(null)}
                    style={({ pressed }) =>
                      pressed ? { backgroundColor: colors.fill } : undefined
                    }
                    className="flex-row items-center gap-3 border-b border-app-border px-4 py-3 dark:border-app-border-dark">
                    <View
                      className="h-8 w-8 items-center justify-center rounded-[10px]"
                      style={{
                        backgroundColor: `${colors.primary}${isDark ? '26' : '14'}`,
                      }}>
                      <Layers size={16} color={colors.primary} strokeWidth={1.75} />
                    </View>
                    <Text className="flex-1 text-[15px] text-app-ink dark:text-app-ink-dark">
                      All categories
                    </Text>
                    {selectedId === null ? (
                      <Check size={17} color={colors.primary} strokeWidth={2.5} />
                    ) : null}
                  </Pressable>

                  {categories.map((category, index) => (
                    <CategoryOption
                      key={category.id}
                      category={category}
                      isSelected={category.id === selectedId}
                      isLast={index === categories.length - 1}
                      onPress={() => handleSelect(category.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
});
