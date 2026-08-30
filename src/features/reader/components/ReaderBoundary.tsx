import { Component, type ErrorInfo, type ReactNode } from 'react';

import { ReaderError } from '@/features/reader/components/ReaderError';

type ReaderBoundaryProps = {
  children: ReactNode;
};

type ReaderBoundaryState = {
  hasError: boolean;
  message: string | null;
};

const CLEAR: ReaderBoundaryState = { hasError: false, message: null };

/**
 * The reader's last line of defence.
 *
 * A render-time throw anywhere under the reading stage would otherwise take the
 * whole app down. Here it lands on the same failure screen a network error
 * does, and "Try again" remounts the stage from scratch.
 */
export class ReaderBoundary extends Component<ReaderBoundaryProps, ReaderBoundaryState> {
  state: ReaderBoundaryState = CLEAR;

  static getDerivedStateFromError(error: unknown): ReaderBoundaryState {
    const message = error instanceof Error ? error.message.trim() : '';
    return { hasError: true, message: message || null };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (__DEV__) {
      console.error('Reader crashed:', error, info.componentStack);
    }
  }

  private handleRetry = () => {
    this.setState(CLEAR);
  };

  render() {
    if (this.state.hasError) {
      return (
        <ReaderError
          message={this.state.message ?? 'This book could not be opened.'}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
