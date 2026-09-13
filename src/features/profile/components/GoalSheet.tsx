import { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import {
  Button,
  Display,
  Icon,
  Sheet,
  Text,
  type LucideIcon,
} from '@/components/ui';
import { MONTHLY_GOAL_RANGE } from '@/services/account';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The goal sheet.
 *
 * One number and two buttons: a monthly target is a small enough figure that
 * stepping to it beats typing it, and the range the server accepts is narrow
 * enough that the steps can simply stop at either end.
 */
export const GoalSheet = memo(function GoalSheet({
  visible,
  onClose,
  target,
  completed,
  saving = false,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  /** The target as saved — what the stepper opens on. */
  target: number;
  /** Books finished so far this month, so the note can say how it stands. */
  completed: number;
  saving?: boolean;
  onSave: (target: number) => void;
}) {
  const [draft, setDraft] = useState(target);

  // Reopening the sheet starts from the saved target again, not from a draft
  // the reader dismissed.
  useEffect(() => {
    if (visible) {
      setDraft(target);
    }
  }, [target, visible]);

  const step = useCallback(
    (delta: number) =>
      setDraft(current =>
        Math.max(
          MONTHLY_GOAL_RANGE.min,
          Math.min(MONTHLY_GOAL_RANGE.max, current + delta),
        ),
      ),
    [],
  );

  const unchanged = draft === target;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="This month’s goal"
      scrollable={false}
      footer={
        <View style={styles.actions}>
          <Button
            label="Save goal"
            loading={saving}
            disabled={unchanged}
            onPress={() => onSave(draft)}
          />
          <Button
            label="Cancel"
            variant="ghost"
            disabled={saving}
            onPress={onClose}
          />
        </View>
      }
    >
      <View style={styles.stepper}>
        <StepButton
          icon={Minus}
          label="Fewer books"
          disabled={draft <= MONTHLY_GOAL_RANGE.min}
          onPress={() => step(-1)}
        />
        <View style={styles.value}>
          <Display size={44} tone="primary">
            {String(draft)}
          </Display>
          <Text size={fontSize.captionSmall} tone="muted">
            {draft === 1 ? 'book a month' : 'books a month'}
          </Text>
        </View>
        <StepButton
          icon={Plus}
          label="More books"
          disabled={draft >= MONTHLY_GOAL_RANGE.max}
          onPress={() => step(1)}
        />
      </View>
      <Text size={fontSize.bodySmall} leading={1.45} tone="muted">
        {completed >= draft
          ? `You have already finished ${completed} this month — this goal is done the moment you save it.`
          : `${completed} finished so far this month. ${draft - completed} more would reach this goal.`}
      </Text>
    </Sheet>
  );
});

const StepButton = memo(function StepButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.stepButton,
        { backgroundColor: colors.controlAlt, borderColor: colors.border },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Icon icon={icon} size={18} tone="soft" />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 8,
  },
  value: {
    minWidth: 96,
    alignItems: 'center',
    gap: 2,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.72,
  },
  actions: {
    gap: 10,
  },
});
