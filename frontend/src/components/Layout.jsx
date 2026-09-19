import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LayoutDashboard, Users, Library, Menu, X, LogOut, Sparkles, ChevronRight } from "lucide-react";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard, description: "Stats & recent feed" },
    { name: "Channels", href: "/channels", icon: Users, description: "Manage subscriptions" },
    { name: "Library", href: "/library", icon: Library, description: "All AI summaries" },
  ];

  const firstInitial = (user?.name || user?.email || "U").charAt(0).toUpperCase();
  const displayName = user?.name || "User";
  const displayEmail = user?.email || "";

  return (
    <div className="h-screen overflow-hidden flex" style={{ background: 'var(--color-surface-50)' }}>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 shrink-0 flex flex-col transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          background: '#ffffff',
          borderRight: '1px solid var(--color-surface-200)',
          boxShadow: '2px 0 8px rgba(15,23,42,0.04)',
        }}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-5 shrink-0" style={{ borderBottom: '1px solid var(--color-surface-100)' }}>
          <Link to="/dashboard" className="flex items-center gap-3 group" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)' }}
            >
              <svg className="w-4.5 h-4.5" style={{ width: '18px', height: '18px', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span
                className="text-base font-bold tracking-tight"
                style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                TubeDigest
              </span>
              <span className="block text-[9px] tracking-widest uppercase" style={{ color: 'var(--color-surface-400)', marginTop: '-1px' }}>
                AI Engine
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto sidebar-scroll">
          <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-3" style={{ color: 'var(--color-surface-400)' }}>
            Navigation
          </p>
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
                style={isActive ? {
                  background: 'var(--color-accent-50)',
                  color: 'var(--color-accent-700)',
                  border: '1px solid var(--color-accent-200)',
                } : {
                  color: 'var(--color-surface-600)',
                  border: '1px solid transparent',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--color-surface-50)'; e.currentTarget.style.color = 'var(--color-surface-900)'; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--color-surface-600)'; }}}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                  style={isActive ? {
                    background: 'var(--color-accent-600)',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                  } : {
                    background: 'var(--color-surface-100)',
                    color: 'var(--color-surface-500)',
                  }}
                >
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{item.name}</p>
                </div>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-accent-500)' }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Live status indicator */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--color-surface-100)' }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#10b981' }}></span>
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#10b981' }}></span>
            </span>
            <span className="text-xs font-medium" style={{ color: '#15803d' }}>System Online</span>
            <span className="ml-auto text-[10px]" style={{ color: '#4ade80' }}>v2.0</span>
          </div>

          {/* User card */}
          {user && (
            <>
              <div
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl mb-2"
                style={{ background: 'var(--color-surface-50)', border: '1px solid var(--color-surface-100)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, var(--color-accent-500), var(--color-indigo-500))' }}
                >
                  {firstInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-surface-800)' }}>{displayName}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--color-surface-400)' }}>{displayEmail}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                style={{
                  color: 'var(--color-surface-500)',
                  background: 'transparent',
                  border: '1px solid var(--color-surface-200)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#b91c1c'; e.currentTarget.style.borderColor = '#fecaca'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-surface-500)'; e.currentTarget.style.borderColor = 'var(--color-surface-200)'; }}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {/* Top Header */}
        <header
          className="h-16 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--color-surface-100)',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg transition-colors lg:hidden cursor-pointer"
              style={{ color: 'var(--color-surface-500)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-100)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; }}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb — current page */}
            <div className="hidden sm:flex items-center gap-2 text-sm" style={{ color: 'var(--color-surface-500)' }}>
              <Sparkles className="w-4 h-4" style={{ color: 'var(--color-accent-500)' }} />
              <span className="font-medium" style={{ color: 'var(--color-surface-700)' }}>
                {navigation.find(n => location.pathname.startsWith(n.href))?.name || 'TubeDigest'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className="hidden sm:block text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: 'var(--color-accent-50)',
                color: 'var(--color-accent-700)',
                border: '1px solid var(--color-accent-200)',
              }}
            >
              Gemini 2.0 Flash
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
