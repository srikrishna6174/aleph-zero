/**
 * useAuth Hook
 * =============
 * Manages authentication state using the Appwrite Web SDK.
 * Provides login, signup, logout, and session persistence.
 */

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { account } from "../lib/appwrite";
import { ID } from "appwrite";

// ─── Auth Context ───────────────────────────────────────────────

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useProvideAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// ─── Auth State Logic ───────────────────────────────────────────

function useProvideAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const currentUser = await account.get();
      setUser(currentUser);
    } catch {
      // No active session — user is logged out
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      await account.createEmailPasswordSession(email, password);
      const currentUser = await account.get();
      setUser(currentUser);
      return currentUser;
    } catch (err) {
      const message =
        err?.message || "Login failed. Please check your credentials.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email, password, name) => {
    try {
      setLoading(true);
      setError(null);
      await account.create(ID.unique(), email, password, name);
      // Auto-login after signup
      await account.createEmailPasswordSession(email, password);
      const currentUser = await account.get();
      setUser(currentUser);
      return currentUser;
    } catch (err) {
      const message =
        err?.message || "Signup failed. Please try again.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await account.deleteSession("current");
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
      // Even if the API call fails, clear local state
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    clearError,
    isAuthenticated: !!user,
  };
}
