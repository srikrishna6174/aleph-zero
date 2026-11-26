import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

export default function AuthForm({ mode = "login", onToggleMode }) {
  const { login, signup, submitting, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const isLogin = mode === "login";

  useEffect(() => {
    setLocalError("");
    clearError();
  }, [mode, clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (!email.trim() || !password) {
      setLocalError("Please fill in all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLocalError("Please enter a valid email address.");
      return;
    }
    if (!isLogin && !name.trim()) {
      setLocalError("Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, name);
      }
    } catch {
      // Error state handled by AuthProvider
    }
  };

  const handleDemoLogin = async () => {
    setEmail("testjudge@example.com");
    setPassword("Password123!");
    setLocalError("");
    clearError();
    try {
      await login("testjudge@example.com", "Password123!");
    } catch {
      // Error handled by AuthProvider
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen page-bg flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Subtle architectural paper dot texture */}
      <div
        className="absolute inset-0 opacity-45 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(120,113,108,0.16) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2.5">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-red-600 shadow-sm">
              <svg
                className="w-5 h-5 text-white"
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
            <div className="text-left">
              <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight leading-tight">
                TubeDigest
              </h1>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                YouTube Reader
              </p>
            </div>
          </div>
          <p className="text-sm text-stone-600">
            Calm, structured summaries for the channels you follow
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-7 sm:p-9">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              {isLogin
                ? "Sign in to read your channel feed"
                : "Start tracking YouTube creators in seconds"}
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {!isLogin && (
              <div className="animate-fade-in">
                <label
                  htmlFor="auth-name"
                  className="block text-xs font-semibold text-stone-700 mb-1.5"
                >
                  Full name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="input-light"
                  required
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                Email address
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-light"
                required
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-light pr-11"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {displayError && (
              <div className="animate-fade-in px-4 py-3 rounded-xl text-xs font-medium bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{displayError}</span>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3 text-[15px] mt-2"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isLogin ? "Signing in…" : "Creating account…"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight size={17} />
                </span>
              )}
            </button>

            {isLogin && (
              <button
                type="button"
                id="auth-fill-demo-btn"
                disabled={submitting}
                onClick={handleDemoLogin}
                className="btn-secondary w-full py-2.5 text-xs text-stone-700"
              >
                Sign In with Demo Account
              </button>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-stone-500">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                id="auth-toggle-mode-btn"
                onClick={onToggleMode}
                className="text-stone-900 hover:text-blue-600 font-semibold underline underline-offset-2 cursor-pointer transition-colors"
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>
        </div>

        {/* Feature chips */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {[
            "70-min auto sync",
            "Multi-layer transcripts",
            "Shorts filtered out",
          ].map((chip) => (
            <span key={chip} className="badge badge-gray">
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
