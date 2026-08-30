import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/** Blocks a back gesture while the form holds unsaved edits. */
export function useUnsavedGuard(isDirty: boolean) {
  const navigation = useNavigation();
  const dirty = useRef(isDirty);
  dirty.current = isDirty;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (!dirty.current) {
        return;
      }
      event.preventDefault();
      Alert.alert('Discard changes?', 'Your edits on this screen have not been saved.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            dirty.current = false;
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [navigation]);
}

/**
 * Compares the live form against the last snapshot. Editors call `reset()`
 * once the record has loaded and again after a successful save.
 */
export function useDirtyTracker<T>(values: T) {
  const serialized = JSON.stringify(values);
  const [baseline, setBaseline] = useState<string | null>(null);

  const reset = useCallback(() => setBaseline(serialized), [serialized]);

  return { isDirty: baseline !== null && baseline !== serialized, reset };
}
