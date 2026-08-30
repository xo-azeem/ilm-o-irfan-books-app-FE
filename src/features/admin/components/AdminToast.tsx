import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

import { DANGER, WARNING } from './AdminUi';

type ToastTone = 'success' | 'error' | 'info';

type Toast = { id: number; message: string; tone: ToastTone };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast must be used inside AdminToastProvider.');
  }
  return value;
}

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const DURATION = 3200;

export function AdminToastProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const show = useCallback((message: string, tone: ToastTone) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    nextId.current += 1;
    setToast({ id: nextId.current, message, tone });
    timer.current = setTimeout(() => setToast(null), DURATION);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: message => show(message, 'success'),
      error: message => show(message, 'error'),
      info: message => show(message, 'info'),
    }),
    [show],
  );

  const Icon = toast ? ICONS[toast.tone] : Info;
  const accent = !toast
    ? colors.primary
    : toast.tone === 'error'
    ? DANGER
    : toast.tone === 'info'
    ? colors.primary
    : WARNING;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <View
          pointerEvents="none"
          style={[styles.host, { top: insets.top + 8 }]}>
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(140)}
            style={[
              styles.toast,
              { backgroundColor: colors.surface, borderColor: `${accent}55` },
            ]}>
            <Icon
              size={18}
              color={toast.tone === 'success' ? colors.primary : accent}
              strokeWidth={2.2}
            />
            <Text size={14} leading={1.35} style={styles.message}>
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  toast: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  message: {
    flex: 1,
  },
});

/** Pulls a readable message out of whatever a mutation rejected with. */
export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error) {
    return error;
  }
  return fallback;
}
