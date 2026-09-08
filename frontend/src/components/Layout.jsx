/**
 * Layout Component
 * =================
 * Premium app shell with sticky glass navigation,
 * animated logo, user menu, and gradient footer.
 */

import { useAuth } from "../hooks/useAuth";

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      {/* Ambient background blurs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[300px] -right-[200px] w-[600px] h-[600px] bg-accent-600/[.06] rounded-full blur-[150px]" />
        <div className="absolute -bottom-[200px] -left-[200px] w-[500px] h-[500px] bg-info/[.04] rounded-full blur-[140px]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 glass-strong border-b border-surface-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-500 to-info flex items-center justify-center shadow-lg shadow-accent-500/20 group-hover:shadow-accent-500/40 transition-shadow duration-300">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold gradient-text">TubeDigest</span>
                <span className="block text-[10px] text-surface-500 -mt-0.5 font-medium tracking-wider uppercase">AI Summaries</span>
              </div>
            </a>

            {/* Center: Status pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-800/60 border border-surface-700/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-xs text-surface-400 font-medium">Worker runs hourly</span>
            </div>

            {/* Right side — User info + logout */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-surface-800/40">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-600 to-accent-400 flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-surface-300 font-medium max-w-[120px] truncate">
                    {user.name || user.email}
                  </span>
                </div>

                <button
                  id="logout-btn"
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-400 hover:text-surface-100 bg-surface-800/60 hover:bg-error/10 hover:text-error border border-surface-700/50 hover:border-error/30 rounded-lg transition-all duration-200 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-surface-800/50 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-accent-500 to-info flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-xs text-surface-500">
                <span className="font-semibold text-surface-400">TubeDigest</span> — AI-powered YouTube channel summaries
              </p>
            </div>
            <p className="text-xs text-surface-600">
              Powered by <span className="text-surface-500">Gemini AI</span> • Built with <span className="text-surface-500">Appwrite</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
