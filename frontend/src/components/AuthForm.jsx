/**
 * AuthForm Component
 * ===================
 * Clean, light-theme login/signup form with premium aesthetics.
 */

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
        background: 'var(--color-surface-50)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background decorations — pointer-events none and z-index 0 */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-160px', right: '-160px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(219,234,254,0.7) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-160px', left: '-160px',
          width: '450px', height: '450px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(237,233,254,0.6) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.35,
          backgroundImage: 'radial-gradient(var(--color-surface-200) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
      </div>

      {/* Content */}
      <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '16px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #2563eb, #6366f1)',
              boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
            }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{
                fontSize: '24px', fontWeight: 800, lineHeight: 1,
                background: 'linear-gradient(135deg, #2563eb, #6366f1)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                TubeDigest
              </h1>
              <p style={{ fontSize: '11px', color: 'var(--color-surface-400)', marginTop: '2px' }}>Powered by Gemini AI</p>
            </div>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-surface-500)' }}>
            AI-powered YouTube channel summaries, delivered hourly
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--color-surface-200)',
          borderRadius: '20px',
          padding: '2rem',
          boxShadow: '0 4px 24px rgba(15,23,42,0.08), 0 1px 6px rgba(15,23,42,0.05)',
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-surface-900)' }}>
              {isLogin ? "Welcome back 👋" : "Create your account"}
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--color-surface-500)', marginTop: '4px' }}>
              {isLogin ? "Sign in to access your summaries" : "Start tracking channels for free"}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Name (signup only) */}
            {!isLogin && (
              <div className="animate-fade-in">
                <label htmlFor="auth-name" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-surface-700)', marginBottom: '6px' }}>
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
              <label htmlFor="auth-email" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-surface-700)', marginBottom: '6px' }}>
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
              <label htmlFor="auth-password" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-surface-700)', marginBottom: '6px' }}>
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
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-surface-400)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {displayError && (
              <div
                className="animate-fade-in"
                style={{
                  padding: '10px 14px', borderRadius: '12px', fontSize: '13px',
                  background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }}>
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
              style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '15px', marginTop: '4px' }}
            >
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity: 0.75 }} />
                  </svg>
                  {isLogin ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '13.5px', color: 'var(--color-surface-500)' }}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                id="auth-toggle-mode-btn"
                onClick={onToggleMode}
                style={{ color: 'var(--color-accent-600)', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontSize: '13.5px' }}
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>
        </div>

        {/* Feature chips */}
        <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
          {["Hourly AI summaries", "Zero-setup tracking", "Powered by Gemini"].map((f) => (
            <span
              key={f}
              style={{
                fontSize: '12px', padding: '5px 12px', borderRadius: '999px', fontWeight: 500,
                background: '#ffffff', border: '1px solid var(--color-surface-200)',
                color: 'var(--color-surface-500)',
                boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
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
