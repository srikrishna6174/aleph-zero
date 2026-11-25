import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSummaries } from "../hooks/useSummaries";
import RequestSummaryModal from "./RequestSummaryModal";
import {
  LayoutDashboard,
  Users,
  Library,
  Menu,
  X,
  LogOut,
  Sparkles,
  RefreshCw,
  ListPlus,
} from "lucide-react";
import toast from "react-hot-toast";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const {
    localSyncSupported,
    syncRunning,
    syncNow,
    requestModalOpen,
    setRequestModalOpen,
  } = useSummaries();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigation = [
    {
      name: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Channels",
      href: "/channels",
      icon: Users,
    },
    {
      name: "Library",
      href: "/library",
      icon: Library,
    },
  ];

  const firstInitial = (user?.name || user?.email || "U")
    .charAt(0)
    .toUpperCase();
  const displayName = user?.name || "User";
  const displayEmail = user?.email || "";

  const handleSyncNow = async () => {
    const res = await syncNow();
    if (res?.supported) {
      toast.success("Sync started — summaries update live as they complete");
    } else {
      toast(
        "Worker runs automatically on schedule (or run python worker/worker.py --watch locally).",
      );
    }
  };

  return (
    <div className="h-screen overflow-hidden flex page-bg text-zinc-200">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 shrink-0 flex flex-col transition-transform duration-300 ease-in-out glass-strong border-r border-white/[0.06] ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-5 shrink-0 border-b border-white/[0.06]">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 group"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 bg-gradient-to-br from-blue-600 to-indigo-600">
              <svg
                className="w-4.5 h-4.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white block leading-tight">
                TubeDigest
              </span>
              <span className="block text-[10px] tracking-widest uppercase gradient-text font-bold">
                AI Engine
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg lg:hidden text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto sidebar-scroll">
          <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-3 text-zinc-500">
            Navigation
          </p>
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                  isActive
                    ? "bg-blue-500/12 text-white border-blue-500/25 shadow-[0_2px_12px_rgba(37,99,235,0.12)]"
                    : "text-zinc-400 border-transparent hover:bg-white/[0.04] hover:text-zinc-100"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                    isActive
                      ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)]"
                      : "bg-white/[0.05] text-zinc-500"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="flex-1 truncate font-semibold">
                  {item.name}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400 animate-pulse-glow" />
                )}
              </Link>
            );
          })}

          <div className="pt-4">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setRequestModalOpen(true);
              }}
              className="btn-primary w-full py-2.5 text-xs"
            >
              <ListPlus className="w-4 h-4" />
              Request Video Summary
            </button>
          </div>
        </nav>

        {/* Bottom status & user card */}
        <div className="px-4 py-4 border-t border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl glass">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-xs font-semibold text-zinc-300">
              {syncRunning ? "Worker Generating…" : "System Online"}
            </span>
            <span className="ml-auto text-[10px] font-bold text-emerald-400">
              70m
            </span>
          </div>

          {user && (
            <>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold bg-gradient-to-br from-blue-500 to-indigo-500">
                  {firstInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-zinc-100">
                    {displayName}
                  </p>
                  <p className="text-[11px] truncate text-zinc-500">
                    {displayEmail}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer text-zinc-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {/* Top Header */}
        <header className="h-16 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 glass border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg transition-colors lg:hidden cursor-pointer hover:bg-white/5 text-zinc-300"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-zinc-100 tracking-wide">
                {navigation.find((n) => location.pathname.startsWith(n.href))
                  ?.name || "TubeDigest"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="open-request-summary-btn"
              type="button"
              onClick={() => setRequestModalOpen(true)}
              className="btn-primary text-xs py-1.5 px-3"
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>
                Select Videos{" "}
                <span className="hidden sm:inline">&amp; Summarize</span>
              </span>
            </button>
            {localSyncSupported && (
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncRunning}
                className="btn-secondary text-xs py-1.5 px-3"
                title="Run background AI worker now"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${syncRunning ? "animate-spin text-blue-400" : ""}`}
                />
                <span className="hidden sm:inline">
                  {syncRunning ? "Syncing…" : "Sync Now"}
                </span>
              </button>
            )}
            <span className="hidden md:inline-flex badge badge-blue">
              Gemini 3.6 Flash
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto animate-fade-in-up">{children}</div>
        </main>
      </div>

      <RequestSummaryModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
      />
    </div>
  );
}
