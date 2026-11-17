import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Last line of defense: a render crash shows a recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-base font-medium">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted">{this.state.error.message}</p>
        <button type="button" onClick={() => location.reload()} className="h-8 rounded-md border border-line-strong px-3 text-sm hover:bg-raised">
          Reload GitPulse
        </button>
      </div>
    );
  }
}
