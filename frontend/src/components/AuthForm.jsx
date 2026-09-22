import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

export default function AuthForm({ mode = "login", onToggleMode }) {
  const { login, signup, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const isLogin = mode === "login";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (!email || !password) {
      setLocalError("Please fill in all required fields.");
      return;
    }
    if (!isLogin && !name) {
      setLocalError("Please enter your name.");
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
      // Error handled by the hook
    }
  };

  const displayError = localError || error;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-surface-950)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background decorations */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-160px', right: '-160px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-160px', left: '-160px',
          width: '450px', height: '450px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.15,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
      </div>

      {/* Content */}
      <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, var(--color-accent-600), var(--color-indigo-600))',
              boxShadow: '0 8px 30px rgba(37,99,235,0.4)',
            }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{
                fontSize: '28px', fontWeight: 800, lineHeight: 1.1,
                color: 'white',
              }}>
                TubeDigest
              </h1>
              <p className="gradient-text uppercase tracking-widest font-bold" style={{ fontSize: '11px', marginTop: '2px' }}>AI Engine</p>
            </div>
          </div>
          <p style={{ fontSize: '15px', color: 'var(--color-surface-400)' }}>
            AI-powered YouTube channel summaries
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
              {isLogin ? "Welcome back 👋" : "Create account"}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-surface-400)', marginTop: '8px' }}>
              {isLogin ? "Sign in to access your dashboard" : "Start tracking channels for free"}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Name (signup only) */}
            {!isLogin && (
              <div className="animate-fade-in">
                <label htmlFor="auth-name" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-surface-400)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="input-light"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="auth-email" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-surface-400)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email Address
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

            {/* Password */}
            <div>
              <label htmlFor="auth-password" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-surface-400)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-light"
                  style={{ paddingRight: '2.75rem' }}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-surface-500)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {displayError && (
              <div
                className="animate-fade-in"
                style={{
                  padding: '12px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171',
                  display: 'flex', alignItems: 'flex-start', gap: '10px', backdropFilter: 'blur(8px)',
                }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, marginTop: '0px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {displayError}
              </div>
            )}

            {/* Submit */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', marginTop: '8px', letterSpacing: '0.02em' }}
            >
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity: 0.75 }} />
                  </svg>
                  {isLogin ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--color-surface-400)' }}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                id="auth-toggle-mode-btn"
                onClick={onToggleMode}
                style={{ color: 'var(--color-accent-400)', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontSize: '14px' }}
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>
        </div>

        {/* Feature chips */}
        <div style={{ marginTop: '32px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
          {["Hourly summaries", "Zero-setup tracking", "Powered by Gemini 2.0"].map((f) => (
            <span
              key={f}
              style={{
                fontSize: '11px', padding: '6px 14px', borderRadius: '999px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--color-surface-400)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
