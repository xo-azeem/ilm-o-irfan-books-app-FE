import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

type AppErrorBoundaryState = {
  hasError: boolean;
  /** Bumped on retry so the whole tree under the boundary remounts. */
  attempt: number;
};

function CrashScreen({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <EmptyState
        title="Something went wrong"
        message="The app hit a problem it could not recover from on its own. Your library, progress and downloads are safe."
        action={{ label: 'Try again', onPress: onRetry }}
      />
    </View>
  );
}

/**
 * The app's last line of defence.
 *
 * The reader has its own boundary; everything else — a screen, a provider's
 * child, a tab — would otherwise take the whole app to the OS's crash dialog
 * on a render-time throw. Here it lands on the same empty-state shape every
 * other failure in the app uses, and "Try again" remounts the navigator from
 * scratch (a new `key`), which is as close to a restart as JS can get.
 *
 * Sits inside the providers, so the fallback keeps the theme and the design
 * system; a throw inside a provider itself still reaches the OS, which is the
 * right outcome for a broken foundation.
 */
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false, attempt: 0 };

  static getDerivedStateFromError(): Partial<AppErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (__DEV__) {
      console.error('App crashed:', error, info.componentStack);
    }
  }

  private handleRetry = () => {
    this.setState(state => ({ hasError: false, attempt: state.attempt + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return <CrashScreen onRetry={this.handleRetry} />;
    }
    return (
      <View key={this.state.attempt} style={styles.root}>
        {this.props.children}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
