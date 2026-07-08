import { lazy, Suspense, type ComponentType } from 'react';
import { View } from 'react-native';

function TabScreenFallback() {
  return <View className="flex-1 bg-app-bg dark:bg-app-bg-dark" />;
}

export function lazyScreen<P extends object>(
  importFn: () => Promise<Record<string, ComponentType<P>>>,
  exportName: string,
) {
  const LazyComponent = lazy(async () => {
    const module = await importFn();
    return { default: module[exportName] as ComponentType<P> };
  });

  function LazyScreen(props: P) {
    return (
      <Suspense fallback={<TabScreenFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  }

  return LazyScreen;
}
