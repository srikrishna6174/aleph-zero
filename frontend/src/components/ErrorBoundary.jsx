import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen page-bg flex items-center justify-center p-6 text-zinc-100">
          <div className="glass-card max-w-lg w-full p-8 text-center border-red-500/25 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center bg-red-500/15 border border-red-500/30 text-red-400">
              <AlertTriangle size={30} />
            </div>

            <h2 className="text-2xl font-extrabold text-white mb-2.5 tracking-tight">
              Something unexpected happened
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed mb-7">
              The application encountered a runtime error. Your channels and
              summaries are completely safe.
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-primary text-sm"
              >
                <RefreshCw size={16} />
                Reload Page
              </button>
              <a href="/dashboard" className="btn-secondary text-sm">
                <Home size={16} />
                Go to Dashboard
              </a>
            </div>

            {this.state.error && (
              <details className="mt-7 text-left bg-black/40 p-4 rounded-xl text-xs text-zinc-400 border border-white/[0.06] cursor-pointer">
                <summary className="font-semibold text-zinc-200">
                  Technical Details
                </summary>
                <pre className="mt-2.5 whitespace-pre-wrap break-all font-mono text-[11px] text-red-400">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
