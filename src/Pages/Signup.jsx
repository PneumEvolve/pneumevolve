// src/pages/Signup.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { useAuth } from "../context/AuthContext";

const API_URL = "https://shea-klipper-backend.onrender.com";
const RECAPTCHA_SITE_KEY = "6LeICxYrAAAAANn97Wz-rx1oCT9FkKMNQpAya_gv";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const recaptchaRef = useRef(null);
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) navigate("/");
  }, [isLoggedIn, navigate]);

  // Track <html>.dark to theme reCAPTCHA dynamically
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const root = document.documentElement;
    const obs = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const captchaTheme = useMemo(() => (isDark ? "dark" : "light"), [isDark]);

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
    setError("");
  };

  const handleSignup = async () => {
    if (loading) return;
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email.");
      return;
    }
    if (password.trim().length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!captchaToken) {
      setError("Please verify you are not a robot.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          recaptcha_token: captchaToken,
        }),
      });

      if (!res.ok) {
        let msg = "Signup failed";
        try {
          const data = await res.json();
          msg = data?.detail || msg;
        } catch {}
        throw new Error(msg);
      }

      // Success — send to login with a friendly flag
      navigate("/login?justSignedUp=true");
    } catch (err) {
      console.error("❌ Signup error:", err);
      setError(err.message || "Signup failed.");
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
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
        {/* Card */}
        <div className="card relative overflow-hidden">
          {/* Subtle top glow */}
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
                Create Your PneumEvolve Account
              </div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>
                One step closer to building the new world.
              </div>
            </div>

            {error && (
              <div
                className="mb-3 text-sm p-2 rounded"
                style={{
                  background:
                    "color-mix(in oklab, #ef4444 14%, var(--bg-elev))",
                  border:
                    "1px solid color-mix(in oklab, #ef4444 35%, var(--border))",
                  color: "var(--text)",
                }}
              >
                {error}
              </div>
            )}

            {/* Form */}
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
            <div className="relative mb-1">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="pr-24"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSignup();
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
            <div className="text-xs mb-3" style={{ color: "var(--muted)" }}>
              Use a strong passphrase. You can change it later.
            </div>

            <div className="mb-4">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={handleCaptchaChange}
                theme={captchaTheme}
              />
            </div>

            <button
              onClick={handleSignup}
              disabled={loading}
              className="btn w-full"
              aria-busy={loading}
            >
              {loading ? "Creating your account…" : "Sign Up"}
            </button>

            <div className="mt-4 text-sm text-center" style={{ color: "var(--muted)" }}>
              Already have an account?{" "}
              <button
                type="button"
                className="link-default"
                onClick={() => navigate("/login")}
              >
                Log in here
              </button>
            </div>
          </div>
        </div>

        {/* Tiny corner indicator (optional) */}
        <div className="theme-indicator mt-4 inline-block">
          Theme: {isDark ? "Dark" : "Light"}
        </div>
      </div>
    </div>
  );
}