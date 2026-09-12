import { Fragment, memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronDown, ChevronUp, GripHorizontal, X } from 'lucide-react-native';

import { Divider, Icon, Text, Toggle } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

export type OrderableItem = {
  id: string;
  label: string;
  sublabel?: string;
  /** When present, the row carries a visibility switch instead of a remove. */
  visible?: boolean;
};

/**
 * An ordered list a person can rearrange.
 *
 * Move-up / move-down rather than drag-and-drop: this list lives inside a
 * scroll view, where a long-press drag fights the scroll gesture. The arrows
 * are slower to use but they never lose a row.
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
      <View
        style={[
          styles.empty,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
        ]}
      >
        <Text size={12.5} leading={1.45} align="center" tone="muted">
          {emptyLabel}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.list,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
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
    <View style={[styles.row, hidden && styles.dimmed]}>
      <Icon
        icon={GripHorizontal}
        size={15}
        color={colors.dim}
        strokeWidth={2}
      />

      <View style={styles.body}>
        <Text size={13} leading={1.2} numberOfLines={1}>
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
        style={[styles.control, isFirst && styles.disabled]}
      >
        <Icon icon={ChevronUp} size={16} tone="muted" strokeWidth={2.2} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Move ${item.label} down`}
        onPress={() => onMove(index, index + 1)}
        disabled={isLast}
        hitSlop={6}
        style={[styles.control, isLast && styles.disabled]}
      >
        <Icon icon={ChevronDown} size={16} tone="muted" strokeWidth={2.2} />
      </Pressable>

      {onToggleVisible ? (
        <Toggle
          value={item.visible !== false}
          onValueChange={next => onToggleVisible(item.id, next)}
          size="admin"
          trackOff={colors.controlActive}
          accessibilityLabel={`Show ${item.label}`}
        />
      ) : onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.label}`}
          onPress={() => onRemove(item.id)}
          hitSlop={8}
          style={styles.control}
        >
          <Icon icon={X} size={13} tone="danger" strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  list: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dimmed: {
    opacity: 0.6,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  control: {
    padding: 3,
  },
  disabled: {
    opacity: 0.25,
  },
  empty: {
    padding: 22,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderStyle: 'dashed',
  },
});
