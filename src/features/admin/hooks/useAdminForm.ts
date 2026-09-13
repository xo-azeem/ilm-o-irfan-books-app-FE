import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useNavigation } from '@react-navigation/native';

import { showDialog } from '@/components/ui';

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Blocks a back gesture while the form holds unsaved edits.
 *
 * Takes the tracker's ref rather than its boolean: an editor calls `reset()`
 * and `goBack()` in the same breath after a save, and the back action is
 * checked synchronously — before the render that would clear a boolean. The
 * ref is cleared in `reset()` itself, so the leave is never challenged.
 */
export function useUnsavedGuard(dirty: RefObject<boolean>) {
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (!dirty.current) {
        return;
      }
      event.preventDefault();
      showDialog({
        title: 'Discard changes?',
        message: 'Your edits on this screen have not been saved.',
        actions: [
          { label: 'Keep editing', style: 'cancel' },
          {
            label: 'Discard',
            style: 'destructive',
            onPress: () => {
              dirty.current = false;
              navigation.dispatch(event.data.action);
            },
          },
        ],
      });
    });

    return unsubscribe;
  }, [dirty, navigation]);
}

/**
 * Compares the live form against the last snapshot. Editors call `reset()`
 * once the record has loaded and again after a successful save.
 *
 * A reset is applied one render late, on purpose. Editors call it from an
 * effect in the same commit as the `setForm` that loads the record, and a
 * snapshot taken right then would capture the form *before* that state
 * lands — every loaded record would open marked UNSAVED. Deferring it means
 * the baseline is always the values as they stand after the reset.
 */
export function useDirtyTracker<T>(values: T) {
  const serialized = JSON.stringify(values);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [requested, setRequested] = useState(0);

  useEffect(() => {
    if (requested > 0) {
      setBaseline(serialized);
    }
    // Only a reset request re-snapshots; typing must not move the baseline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested]);

  const isDirty = baseline !== null && baseline !== serialized;

  // The same answer, readable synchronously by the leave guard.
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;

  const reset = useCallback(() => {
    dirtyRef.current = false;
    setRequested(count => count + 1);
  }, []);

  return { isDirty, reset, dirtyRef };
}
