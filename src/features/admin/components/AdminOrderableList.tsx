import { Pressable, View } from 'react-native';
import { ChevronDown, ChevronUp, X } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

export type OrderableItem = {
  id: string;
  label: string;
  sublabel?: string;
};

/**
 * Move-up / move-down ordering. Chosen over drag-and-drop because the editor
 * lives inside a scroll view where a long-press drag fights the scroll gesture.
 */
export function AdminOrderableList({
  items,
  onChange,
  emptyLabel = 'Nothing added yet.',
}: {
  items: OrderableItem[];
  onChange: (next: OrderableItem[]) => void;
  emptyLabel?: string;
}) {
  const { colors } = useTheme();

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  if (items.length === 0) {
    return (
      <View className="items-center rounded-[12px] px-4 py-6" style={{ backgroundColor: colors.fill }}>
        <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-[12px] bg-app-surface dark:bg-app-surface-dark">
      {items.map((item, index) => (
        <View
          key={item.id}
          className={`flex-row items-center gap-2 px-3 py-2.5 ${
            index === items.length - 1
              ? ''
              : 'border-b border-app-border dark:border-app-border-dark'
          }`}>
          <Text className="w-6 text-[12px] font-semibold text-app-faint dark:text-app-faint-dark">
            {index + 1}
          </Text>

          <View className="min-w-0 flex-1">
            <Text className="text-[14px] text-app-ink dark:text-app-ink-dark" numberOfLines={1}>
              {item.label}
            </Text>
            {item.sublabel ? (
              <Text
                className="text-[11px] text-app-muted dark:text-app-muted-dark"
                numberOfLines={1}>
                {item.sublabel}
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={() => move(index, index - 1)}
            disabled={index === 0}
            hitSlop={6}
            className="p-1 active:opacity-60"
            style={{ opacity: index === 0 ? 0.25 : 1 }}>
            <ChevronUp size={18} color={colors.muted} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            onPress={() => move(index, index + 1)}
            disabled={index === items.length - 1}
            hitSlop={6}
            className="p-1 active:opacity-60"
            style={{ opacity: index === items.length - 1 ? 0.25 : 1 }}>
            <ChevronDown size={18} color={colors.muted} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            onPress={() => onChange(items.filter(entry => entry.id !== item.id))}
            hitSlop={6}
            className="p-1 active:opacity-60">
            <X size={17} color={colors.faint} strokeWidth={2.2} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
