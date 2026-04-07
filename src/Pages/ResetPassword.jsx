// src/Pages/ResetPassword.jsx
import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
 
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
 
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState(null); // "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
 
  // No token in URL — show a clear message instead of a broken form
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[var(--bg)] text-[var(--text)]">
        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="text-sm text-[var(--muted)]">
            This reset link is invalid or has expired.
          </p>
          <Link to="/forgot-password" className="text-sm hover:underline">
            Request a new one →
          </Link>
        </div>
      </div>
    );
  }
 
  async function handleSubmit(e) {
    e.preventDefault();
 
    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      setStatus("error");
      return;
    }
    if (newPassword !== confirm) {
      setErrorMsg("Passwords don't match.");
      setStatus("error");
      return;
    }
 
    setLoading(true);
    setStatus(null);
    try {
      await api.post("/auth/reset-password", {
        token,
        new_password: newPassword,
      });
      setStatus("success");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || "Reset failed. The link may have expired.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }
 
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[var(--bg)] text-[var(--text)]">
      <div className="w-full max-w-sm space-y-6">
 
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
          <p className="text-sm text-[var(--muted)]">
            Must be at least 8 characters.
          </p>
        </div>
 
        {status === "success" ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 text-sm leading-6 space-y-2">
            <p className="font-medium">Password updated.</p>
            <p className="text-[var(--muted)]">Taking you to login…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoFocus
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--text)] transition"
              />
            </div>
 
            <div className="space-y-1">
              <label className="text-sm font-medium">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Same password again"
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--text)] transition"
              />
            </div>
 
            {status === "error" && (
              <p className="text-sm text-red-500">{errorMsg}</p>
            )}
 
            <button
              type="submit"
              disabled={loading || !newPassword || !confirm}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2.5 text-sm font-medium shadow-sm hover:shadow transition disabled:opacity-40"
            >
              {loading ? "Updating…" : "Update password"}
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