/**
 * AuthProvider Component
 * ======================
 * Manages authentication state using Appwrite Web SDK.
 * Separates initial session hydration (`loading`) from active form
 * submissions (`submitting`) so error states never unmount routes.
 */

import { useState, useEffect, useCallback } from "react";
import { account } from "../lib/appwrite";
import { ID } from "appwrite";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const checkSession = useCallback(async () => {
    try {
      setError(null);
      const currentUser = await account.get();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (email, password) => {
    const cleanEmail = email.trim();
    try {
      setSubmitting(true);
      setError(null);
      try {
        await account.createEmailPasswordSession({
          email: cleanEmail,
          password,
        });
      } catch (err) {
        // Handle stale active session cleanly
        if (
          err?.type === "user_session_already_exists" ||
          err?.message?.toLowerCase().includes("session is active")
        ) {
          await account.deleteSession({ sessionId: "current" }).catch(() => {});
          await account.createEmailPasswordSession({
            email: cleanEmail,
            password,
          });
        } else {
          throw err;
        }
      }
      const currentUser = await account.get();
      setUser(currentUser);
      return currentUser;
    } catch (err) {
      const message =
        err?.message || "Login failed. Please check your credentials.";
      setError(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const signup = useCallback(async (email, password, name) => {
    const cleanEmail = email.trim();
    const cleanName = name.trim();
    try {
      setSubmitting(true);
      setError(null);
      await account.create({
        userId: ID.unique(),
        email: cleanEmail,
        password,
        name: cleanName,
      });
      await account.createEmailPasswordSession({
        email: cleanEmail,
        password,
      });
      const currentUser = await account.get();
      setUser(currentUser);
      return currentUser;
    } catch (err) {
      const message = err?.message || "Signup failed. Please try again.";
      setError(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setSubmitting(true);
      await account.deleteSession({ sessionId: "current" });
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
      setUser(null);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    user,
    loading,
    submitting,
    error,
    login,
    signup,
    logout,
    clearError,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
