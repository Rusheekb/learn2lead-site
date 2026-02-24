import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Home } from 'lucide-react';
import { captureException, addBreadcrumb } from '@/lib/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Auto-retry once for transient errors (chunk load failures, etc.)
    if (this.state.retryCount === 0) {
      addBreadcrumb({
        category: 'error-boundary',
        message: 'Transient error – auto-retrying',
        level: 'warning',
        data: { errorMessage: error.message?.slice(0, 200) },
      });

      this.retryTimeout = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prev.retryCount + 1,
        }));
      }, 500);
      return;
    }

    // Second failure – report and show UI
    addBreadcrumb({
      category: 'error-boundary',
      message: 'Error caught by ErrorBoundary',
      level: 'error',
      data: { componentStack: errorInfo.componentStack?.slice(0, 500) },
    });

    captureException(error, {
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  public componentWillUnmount() {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError && this.state.retryCount >= 1) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-lg text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <RefreshCw className="h-7 w-7 text-muted-foreground" />
            </div>

            <h1 className="text-xl font-semibold text-foreground mb-2">
              We hit a snag
            </h1>

            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
              Something unexpected happened. A quick reload usually fixes it — if not, head back home.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-destructive/10 rounded-md text-left">
                <p className="text-sm font-mono text-destructive mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">
                      Stack trace
                    </summary>
                    <pre className="mt-2 text-muted-foreground overflow-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = '/')} className="gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
