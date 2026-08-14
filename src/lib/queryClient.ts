import { AppState } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';

focusManager.setEventListener(handleFocus => {
  const subscription = AppState.addEventListener('change', state => {
    handleFocus(state === 'active');
  });
  return () => subscription.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        return failureCount < 2 && status !== 401 && status !== 403 && status !== 404;
      },
      refetchOnMount: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: { retry: 0 },
  },
});
