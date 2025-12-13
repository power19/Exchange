import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ Oops!</h1>
            <p className="text-gray-700 mb-4">Something went wrong with the app.</p>
            <details className="mb-4">
              <summary className="cursor-pointer text-blue-600 font-medium">
                Show error details
              </summary>
              <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">
                {this.state.error?.toString()}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
