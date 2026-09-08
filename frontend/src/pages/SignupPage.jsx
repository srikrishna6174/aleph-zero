/**
 * SignupPage
 * ===========
 * Signup view using the AuthForm component.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import { useAuth } from "../hooks/useAuth";

export default function SignupPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  return (
    <>
      <title>Create Account — TubeDigest</title>
      <meta name="description" content="Create your TubeDigest account to track YouTube channels and receive AI-generated summaries." />
      <AuthForm
        mode="signup"
        onToggleMode={() => navigate("/login")}
      />
    </>
  );
}
