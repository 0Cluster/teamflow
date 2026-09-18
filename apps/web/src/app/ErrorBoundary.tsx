import { Component, type PropsWithChildren, type ReactNode } from "react";

interface ErrorBoundaryState {
  error: Error | null;
}

export class RouteErrorBoundary extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(
    error: Error,
  ): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error("Route render failed:", error);
  }

  render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
          <div className="max-w-md rounded-xl border border-red-900 bg-red-950/30 p-6 text-center">
            <h1 className="text-lg font-semibold text-white">
              Something went wrong
            </h1>

            <p className="mt-2 break-words text-sm text-red-300">
              {this.state.error.message}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
