import { RootNavigator } from '@/app/navigation/RootNavigator';
import { AppProviders } from '@/app/providers/AppProviders';

export function App() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
