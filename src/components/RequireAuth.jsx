import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function RequireAuth({ children }) {
  const { isLoggedIn, loading } = useAuth?.() || {};
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      const next = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?next=${next}`, { replace: true });
    }
  }, [isLoggedIn, loading, navigate, location]);

  if (loading) return null;
  if (!isLoggedIn) return null;

  return children;
}