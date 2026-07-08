import { memo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Check, ChevronDown, Layers } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import { categories } from '@/features/explore/data/exploreContent';
import type { CategoryItem } from '@/features/explore/data/exploreContent';
import { useTheme } from '@/theme/ThemeContext';

type Anchor = { x: number; y: number; width: number; height: number };

type CategoryOptionProps = {
  category: CategoryItem;
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

export const SearchCategorySection = memo(function SearchCategorySection() {
  const { isDark, colors } = useTheme();

  const triggerRef = useRef<View>(null);
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
      <View className="mb-6 gap-1.5">
        <DisplayText className="text-[22px] font-bold leading-7 tracking-tight text-app-ink dark:text-app-ink-dark">
          Browse categories
        </DisplayText>
        <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
          Filter the catalog by topic
        </Text>
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
