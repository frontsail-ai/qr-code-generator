import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen plico-grid flex items-center justify-center p-4">
          <div className="bg-[var(--paper-card)] border-2 border-[var(--border-strong)] rounded-[2px] shadow-[var(--shadow-md)] p-8 text-center max-w-md">
            <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              The app hit an unexpected error. Reload to continue — your saved history is safe.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 bg-[var(--ink-900)] text-[var(--paper-0)] rounded-[2px] text-[13px] font-semibold hover:bg-[var(--ink-700)] transition-colors cursor-pointer"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
