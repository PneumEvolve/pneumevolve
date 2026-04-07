// src/Pages/ForgotPassword.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
 
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // "sent" | "error"
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
 
  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      await api.post("/auth/request-password-reset", { email: email.trim() });
      setStatus("sent");
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || "Something went wrong. Please try again.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }
 
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[var(--bg)] text-[var(--text)]">
      <div className="w-full max-w-sm space-y-6">
 
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="text-sm text-[var(--muted)]">
            Enter your email and we'll send you a reset link.
          </p>
        </div>
 
        {status === "sent" ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 text-sm leading-6 space-y-2">
            <p className="font-medium">Check your inbox.</p>
            <p className="text-[var(--muted)]">
              If an account exists for <strong>{email}</strong>, a reset link is on its way.
              It expires in 30 minutes.
            </p>
            <p className="text-[var(--muted)]">
              Don't see it? Check your spam folder.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--text)] transition"
              />
            </div>
 
            {status === "error" && (
              <p className="text-sm text-red-500">{errorMsg}</p>
            )}
 
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2.5 text-sm font-medium shadow-sm hover:shadow transition disabled:opacity-40"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
 
        <p className="text-center text-sm text-[var(--muted)]">
          <Link to="/login" className="hover:underline">Back to login</Link>
        </p>
 
      </div>
    </div>
  );
}