import { Fragment, memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronDown, ChevronUp, GripHorizontal, X } from 'lucide-react-native';

import { Card, Divider, Icon, Text, Toggle } from '@/components/ui';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

export type OrderableItem = {
  id: string;
  label: string;
  sublabel?: string;
  /** When present, the row carries a visibility switch instead of a remove. */
  visible?: boolean;
};

/**
 * Move-up / move-down ordering.
 *
 * Chosen over drag-and-drop because the list lives inside a scroll view, where
 * a long-press drag fights the scroll gesture — the arrows are slower to use
 * but they never lose a row.
 */
export const AdminOrderableList = memo(function AdminOrderableList({
  items,
  onChange,
  onToggleVisible,
  emptyLabel = 'Nothing added yet.',
}: {
  items: OrderableItem[];
  onChange: (next: OrderableItem[]) => void;
  /** Supplying this swaps each row's remove button for a visibility switch. */
  onToggleVisible?: (id: string, visible: boolean) => void;
  emptyLabel?: string;
}) {
  const { colors } = useTheme();

  const move = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= items.length) {
        return;
      }
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onChange(next);
    },
    [items, onChange],
  );

  const remove = useCallback(
    (id: string) => onChange(items.filter(entry => entry.id !== id)),
    [items, onChange],
  );

  if (items.length === 0) {
    return (
      <Card tone="alt" rounded={radius.chip} padded={22} style={styles.empty}>
        <Text size={fontSize.caption} leading={1.4} tone="muted">
          {emptyLabel}
        </Text>
      </Card>
    );
  }

  return (
    <View
      style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {items.map((item, index) => (
        <Fragment key={item.id}>
          {index > 0 ? <Divider /> : null}
          <OrderableRow
            item={item}
            index={index}
            isFirst={index === 0}
            isLast={index === items.length - 1}
            onMove={move}
            onRemove={onToggleVisible ? undefined : remove}
            onToggleVisible={onToggleVisible}
          />
        </Fragment>
      ))}
    </View>
  );
});

const OrderableRow = memo(function OrderableRow({
  item,
  index,
  isFirst,
  isLast,
  onMove,
  onRemove,
  onToggleVisible,
}: {
  item: OrderableItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (from: number, to: number) => void;
  onRemove?: (id: string) => void;
  onToggleVisible?: (id: string, visible: boolean) => void;
}) {
  const { colors } = useTheme();
  const hidden = onToggleVisible ? item.visible === false : false;

  return (
    <View style={[styles.row, hidden && styles.hidden]}>
      <Icon icon={GripHorizontal} size={15} color={colors.dim} strokeWidth={2} />

      <View style={styles.body}>
        <Text size={fontSize.bodySmall} leading={1.2} numberOfLines={1}>
          {item.label}
        </Text>
        {item.sublabel ? (
          <Text size={11} leading={1.2} tone="faint" numberOfLines={1}>
            {item.sublabel}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Move ${item.label} up`}
        onPress={() => onMove(index, index - 1)}
        disabled={isFirst}
        hitSlop={6}
        style={[styles.arrow, isFirst && styles.disabled]}>
        <Icon icon={ChevronUp} size={17} tone="muted" strokeWidth={2.2} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Move ${item.label} down`}
        onPress={() => onMove(index, index + 1)}
        disabled={isLast}
        hitSlop={6}
        style={[styles.arrow, isLast && styles.disabled]}>
        <Icon icon={ChevronDown} size={17} tone="muted" strokeWidth={2.2} />
      </Pressable>

      {onToggleVisible ? (
        <Toggle
          value={item.visible !== false}
          onValueChange={next => onToggleVisible(item.id, next)}
          size="sm"
          accessibilityLabel={`Show ${item.label} on Home`}
        />
      ) : onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.label}`}
          onPress={() => onRemove(item.id)}
          hitSlop={6}
          style={styles.arrow}>
          <Icon icon={X} size={16} tone="faint" strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  list: {
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  hidden: {
    opacity: 0.65,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  arrow: {
    padding: 3,
  },
  disabled: {
    opacity: 0.25,
  },
  empty: {
    alignItems: 'center',
  },
});
