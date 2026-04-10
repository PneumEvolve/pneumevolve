// src/Pages/ResetPassword.jsx
import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState(null); // "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmMismatch = confirm.length > 0 && newPassword !== confirm;
  const confirmMatch = confirm.length > 0 && newPassword === confirm;

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
      // Log out so they have to sign in fresh with the new password
      await logout();
setTimeout(() => {
  window.location.href = "/login";
}, 2500);
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
            <p className="text-[var(--muted)]">You've been logged out. Taking you to login…</p>
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
              <div className="relative">
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Same password again"
                  required
                  className="w-full rounded-xl border bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition"
                  style={{
                    borderColor: confirmMismatch
                      ? "color-mix(in oklab, #ef4444 60%, var(--border))"
                      : confirmMatch
                      ? "color-mix(in oklab, #10b981 60%, var(--border))"
                      : "var(--border)",
                  }}
                />
              </div>
              <p
                className="text-xs"
                style={{
                  color: confirmMismatch ? "#ef4444" : confirmMatch ? "#10b981" : "transparent",
                }}
              >
                {confirmMismatch ? "Passwords don't match" : confirmMatch ? "✓ Passwords match" : "placeholder"}
              </p>
            </div>

            {status === "error" && (
              <p className="text-sm text-red-500">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading || !newPassword || !confirm || confirmMismatch}
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