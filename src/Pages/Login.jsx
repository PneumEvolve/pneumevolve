import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosInstance";
import { jwtDecode } from "jwt-decode";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const location = useLocation();

  // Dark indicator (purely visual / optional)
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const root = document.documentElement;
    const obs = new MutationObserver(() =>
      setIsDark(root.classList.contains("dark"))
    );
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const justSignedUp = new URLSearchParams(location.search).get("justSignedUp");
    if (justSignedUp) setMessage("Signup successful! Please log in.");
  }, [location]);

  const handleLogin = async () => {
    if (loading) return;
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);

      const formData = new URLSearchParams();
      formData.append("grant_type", "password");
      formData.append("username", email.trim());
      formData.append("password", password.trim());
      formData.append("scope", "");
      formData.append("client_id", "");
      formData.append("client_secret", "");

      const response = await axiosInstance.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        withCredentials: true,
      });

      const { access_token, refresh_token } = response.data;
      const decoded = jwtDecode(access_token);

      login(access_token, refresh_token, decoded.id, decoded.sub);
      const lastVisitedPath = localStorage.getItem("lastVisitedPath") || "/";
      navigate(lastVisitedPath);
    } catch (err) {
      console.error("❌ Login failed", err);
      setError("Invalid login or server error.");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: "var(--bg)",
        backgroundImage: "var(--gradient)",
        color: "var(--text)",
      }}
    >
      {/* Decorative aura */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          maskImage:
            "radial-gradient(500px 300px at 50% 20%, black 60%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(500px 300px at 50% 20%, black 60%, transparent 100%)",
          background:
            "radial-gradient(60% 40% at 50% 20%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 70%)",
        }}
      />

      <div className="w-full max-w-md">
        <div className="card relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-x-0 -top-20 h-32"
            style={{
              background:
                "radial-gradient(300px 120px at 50% 100%, color-mix(in oklab, var(--accent) 20%, transparent), transparent)",
              opacity: 0.6,
            }}
          />
          <div className="relative">
            <div className="text-center mb-4">
              <div className="mb-2 text-2xl font-bold tracking-tight">
                Login to PneumEvolve
              </div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>
                Welcome back. Let’s build something real.
              </div>
            </div>

            {message && (
              <div
                className="mb-3 text-sm p-2 rounded"
                style={{
                  background:
                    "color-mix(in oklab, #10b981 18%, var(--bg-elev))",
                  border: "1px solid color-mix(in oklab, #10b981 35%, var(--border))",
                  color: "var(--text)",
                }}
              >
                {message}
              </div>
            )}
            {error && (
              <div
                className="mb-3 text-sm p-2 rounded"
                style={{
                  background:
                    "color-mix(in oklab, #ef4444 14%, var(--bg-elev))",
                  border: "1px solid color-mix(in oklab, #ef4444 35%, var(--border))",
                  color: "var(--text)",
                }}
              >
                {error}
              </div>
            )}

            <label className="block text-sm mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="mb-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") document.getElementById("password")?.focus();
              }}
            />

            <label className="block text-sm mb-1" htmlFor="password">
              Password
            </label>
            <div className="relative mb-3">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogin();
                }}
              />
              <button
                type="button"
                className="btn btn-secondary absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-sm"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="btn w-full"
              aria-busy={loading}
            >
              {loading ? "Signing you in…" : "Login"}
            </button>

            <div className="mt-4 text-sm text-center" style={{ color: "var(--muted)" }}>
              Don’t have an account?{" "}
              <button
                type="button"
                className="link-default"
                onClick={() => navigate("/signup")}
              >
                Sign up here
              </button>
            </div>
            <div className="mt-2 text-sm text-center">
              <button
                type="button"
                className="link-default"
                onClick={() => navigate("/forgotpassword")}
              >
                Forgot Password?
              </button>
            </div>
          </div>
        </div>

        <div className="theme-indicator mt-4 inline-block">
          Theme: {isDark ? "Dark" : "Light"}
        </div>
      </div>
    </div>
  );
}