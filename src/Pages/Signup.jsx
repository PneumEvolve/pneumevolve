// src/pages/Signup.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { useAuth } from "../context/AuthContext";
 
const MODE = import.meta.env.MODE;
const ENV_API = import.meta.env.VITE_API_URL?.trim();
const ENV_REQUIRE_CAPTCHA = (import.meta.env.VITE_REQUIRE_RECAPTCHA ?? "auto").toLowerCase();
const ENV_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim();
 
const FALLBACK_API =
  MODE === "development"
    ? "http://127.0.0.1:8000"
    : "https://shea-klipper-backend.onrender.com";
 
const API_URL = ENV_API || FALLBACK_API;
 
const REQUIRE_CAPTCHA =
  ENV_REQUIRE_CAPTCHA === "true"
    ? true
    : ENV_REQUIRE_CAPTCHA === "false"
    ? false
    : MODE !== "development";
 
const RECAPTCHA_SITE_KEY = ENV_SITE_KEY || "6LeICxYrAAAAANn97Wz-rx1oCT9FkKMNQpAya_gv";
const TERMS_VERSION = import.meta.env.VITE_TERMS_VERSION?.trim() || "2025-08-21";
 
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
const normalizeUsername = (s) =>
  (s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 30);
 
// Requires at least 2 characters after the final dot — catches @gmail.c etc.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
 
export default function Signup() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [accepted, setAccepted] = useState(false);
 
  const [unameErr, setUnameErr] = useState("");
  const [unameOk, setUnameOk] = useState(false);
  const [checkingUname, setCheckingUname] = useState(false);
 
  const recaptchaRef = useRef(null);
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
 
  useEffect(() => {
    if (isLoggedIn) navigate("/");
  }, [isLoggedIn, navigate]);
 
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
 
  const onUsernameChange = (val) => {
    setUnameErr("");
    setUnameOk(false);
    const n = normalizeUsername(val);
    setUsername(n);
  };
 
  const checkUsername = async () => {
    setUnameErr("");
    setUnameOk(false);
    const n = normalizeUsername(username);
    if (!n || !USERNAME_RE.test(n) || n.length < 3) {
      setUnameErr("3–30 chars, a–z, 0–9, . _ -");
      return;
    }
    if (!API_URL) return;
    try {
      setCheckingUname(true);
      const r = await fetch(`${API_URL}/auth/check-username?username=${encodeURIComponent(n)}`);
      if (!r.ok) throw new Error("Check failed");
      const j = await r.json();
      if (j.ok) setUnameOk(true);
      else setUnameErr(j.error || "Username not available");
    } catch {
      setUnameOk(false);
    } finally {
      setCheckingUname(false);
    }
  };
 
  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
    setError("");
  };
 
  const handleSignup = async () => {
    if (loading) return;
    setError("");
 
    const emailTrim = email.trim();
    const passwordTrim = password.trim();
    const confirmTrim = confirmPassword.trim();
    const usernameTrim = normalizeUsername(username);
 
    if (!emailTrim || !passwordTrim) {
      setError("Email and password are required.");
      return;
    }
 
    // Stricter email check — catches @gmail.c style typos
    if (!EMAIL_RE.test(emailTrim)) {
      setError("Please enter a valid email address (e.g. you@gmail.com).");
      return;
    }
 
    if (passwordTrim.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
 
    // Confirm password check
    if (passwordTrim !== confirmTrim) {
      setError("Passwords don't match. Please try again.");
      return;
    }
 
    if (!USERNAME_RE.test(usernameTrim) || usernameTrim.length < 3) {
      setError("Username: 3–30 chars, a–z, 0–9, . _ -");
      return;
    }
    if (!accepted) {
      setError("Please agree to the Terms and acknowledge the Privacy Policy.");
      return;
    }
    if (REQUIRE_CAPTCHA && !captchaToken) {
      setError("Please verify you are not a robot.");
      return;
    }
 
    try {
      setLoading(true);
      const tokenToSend = REQUIRE_CAPTCHA ? captchaToken : "dev-skip";
 
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrim,
          password: passwordTrim,
          username: usernameTrim,
          recaptcha_token: tokenToSend,
          accept_terms: accepted,
          terms_version: TERMS_VERSION,
          phone_number: phone.trim() || null,
        }),
      });
 
      if (!res.ok) {
        let msg = `Signup failed (HTTP ${res.status})`;
        try {
          const data = await res.json();
          if (typeof data?.detail === "string") msg = data.detail;
          else if (data?.detail?.code === "TERMS_VERSION_MISMATCH") {
            msg = `Please accept Terms v${data.detail.required_version}.`;
          } else if (data?.detail?.code === "TERMS_REQUIRED") {
            msg = `Terms acceptance required (v${data.detail.required_version}).`;
          } else if (data?.message) {
            msg = data.message;
          }
        } catch {}
        throw new Error(msg);
      }
 
      navigate("/login?justSignedUp=true");
    } catch (err) {
      console.error("❌ Signup error:", err);
      setError(err.message || "Signup failed.");
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };
 
  // Live confirm password match indicator
  const confirmMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const confirmMatch = confirmPassword.length > 0 && password === confirmPassword;
 
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: "var(--bg)",
        backgroundImage: "var(--gradient)",
        color: "var(--text)",
      }}
    >
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
                Create Your PneumEvolve Account
              </div>
              
            </div>
 
            {error && (
              <div
                className="mb-3 text-sm p-2 rounded"
                style={{
                  background: "color-mix(in oklab, #ef4444 14%, var(--bg-elev))",
                  border: "1px solid color-mix(in oklab, #ef4444 35%, var(--border))",
                  color: "var(--text)",
                }}
              >
                {error}
              </div>
            )}
 
            {/* Username */}
            <label className="block text-sm mb-1" htmlFor="username">Username</label>
            <div className="flex gap-2 items-start mb-2">
              <input
                id="username"
                type="text"
                placeholder="yourname"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
                onBlur={checkUsername}
                className="flex-1"
                autoCapitalize="off"
                autoCorrect="off"
              />
              <button type="button" className="btn btn-secondary"
                onClick={checkUsername} disabled={checkingUname}>
                {checkingUname ? "Checking…" : "Check"}
              </button>
            </div>
            {unameErr && <div className="text-xs mb-2" style={{ color: "#ef4444" }}>{unameErr}</div>}
            {unameOk && !unameErr && (
              <div className="text-xs mb-2" style={{ color: "var(--accent)" }}>✅ Available</div>
            )}
 
            {/* Email */}
            <label className="block text-sm mb-1" htmlFor="email">Email</label>
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

            {/* Phone — optional, stillness SMS only */}
<label className="block text-sm mb-1" htmlFor="phone">
  Phone number <span style={{ opacity: 0.4, fontWeight: 400 }}>(optional)</span>
</label>
<input
  id="phone"
  type="tel"
  placeholder="+1 555 000 0000"
  className="mb-1"
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
/>
<p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
  Only used to send SMS reminders for Shared Stillness groups. Never shared or used for anything else.
</p>
 
            {/* Password */}
            <label className="block text-sm mb-1" htmlFor="password">Password</label>
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
                  if (e.key === "Enter") document.getElementById("confirmPassword")?.focus();
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
 
            {/* Confirm Password */}
            <label className="block text-sm mb-1" htmlFor="confirmPassword">
              Confirm password
            </label>
            <div className="relative mb-1">
              <input
                id="confirmPassword"
                type={showConfirmPw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Same password again"
                className="pr-24"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSignup();
                }}
                style={{
                  borderColor: confirmMismatch
                    ? "color-mix(in oklab, #ef4444 60%, var(--border))"
                    : confirmMatch
                    ? "color-mix(in oklab, #10b981 60%, var(--border))"
                    : undefined,
                }}
              />
              <button
                type="button"
                className="btn btn-secondary absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-sm"
                onClick={() => setShowConfirmPw((s) => !s)}
                aria-label={showConfirmPw ? "Hide password" : "Show password"}
              >
                {showConfirmPw ? "Hide" : "Show"}
              </button>
            </div>
            <div className="text-xs mb-3" style={{
              color: confirmMismatch ? "#ef4444" : confirmMatch ? "#10b981" : "transparent"
            }}>
              {confirmMismatch ? "Passwords don't match" : confirmMatch ? "✓ Passwords match" : "placeholder"}
            </div>
 
            {/* Terms */}
            <label className="flex items-start gap-2 text-sm mb-2">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                required
              />
              <span>
                I agree to the{" "}
                <a href="/terms" className="underline">Terms of Use</a>{" "}
                and acknowledge the{" "}
                <a href="/privacy" className="underline">Privacy Policy</a>.
              </span>
            </label>
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
              We store your email and the content you save in our database (Supabase).
              Some processing may occur outside Canada. You can request deletion anytime.
            </p>
 
            {REQUIRE_CAPTCHA && (
              <div className="mb-4">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={handleCaptchaChange}
                  theme={captchaTheme}
                />
              </div>
            )}
 
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
 
            {MODE === "development" && (
              <div className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
                <div>API_URL: {API_URL}</div>
                <div>Require CAPTCHA: {String(REQUIRE_CAPTCHA)}</div>
                <div>Terms version: {TERMS_VERSION}</div>
              </div>
            )}
          </div>
        </div>
 
        <div className="theme-indicator mt-4 inline-block">
          Theme: {isDark ? "Dark" : "Light"}
        </div>
      </div>
    </div>
  );
}