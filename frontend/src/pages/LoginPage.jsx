/**
 * LoginPage
 * ==========
 * Login view using the AuthForm component.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  return (
    <>
      <title>Sign In — TubeDigest</title>
      <meta name="description" content="Sign in to TubeDigest to access your AI-powered YouTube channel summaries." />
      <AuthForm
        mode="login"
        onToggleMode={() => navigate("/signup")}
      />
    </>
  );
}
