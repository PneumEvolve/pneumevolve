// src/pages/Account.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Inbox from "@/components/dashboard/Inbox";
import PhoneNumberField from "@/components/PhoneNumberField";
import StillnessNotifPrefs from "@/components/StillnessNotifPrefs";
 
const API = import.meta.env.VITE_API_URL;
 
export default function Account() {
  const { accessToken, userId, userEmail, logout, isLoggedIn, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [unreadCount, setUnreadCount] = useState(0);
 
  // Account state
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
 
  const [daily, setDaily] = useState(null);
  const [seedBalance, setSeedBalance] = useState(0);

  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteForge, setDeleteForge] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");
 
  const location = useLocation();
  const navigate = useNavigate();
 
  // If URL has #account / #inbox / #daily, open that tab on load/hash change
  useEffect(() => {
    const hash = (location.hash || "").replace("#", "");
    if (["account", "inbox", "daily"].includes(hash)) {
      setActiveTab(hash);
    }
  }, [location.hash]);
 
  // helper to fetch daily + balance
  const refreshDaily = async () => {
    if (!userEmail) { setDaily(null); setSeedBalance(0); return; }
    try {
      const headers = { "x-user-email": userEmail };
      const [b, d] = await Promise.all([
        api.get(`/seed/balance`, { headers }),
        api.get(`/seed/daily`, { headers }),
      ]);
      setSeedBalance(b.data?.balance ?? 0);
      setDaily(d.data);
    } catch (e) {
      console.error("Failed to fetch daily/seed:", e?.response?.data || e.message);
    }
  };
 
  useEffect(() => { refreshDaily(); /* eslint-disable-next-line */ }, [userEmail]);
 
  useEffect(() => {
    localStorage.setItem("unreadCount", unreadCount);
    window.dispatchEvent(new Event("storage"));
  }, [unreadCount]);
 
  // Fetch unread count
  useEffect(() => {
    const fetchUnread = async () => {
      if (!userId || !userEmail) return;
      try {
        const res = await api.get(`/inbox/${encodeURIComponent(userEmail)}`);
        const unread = (Array.isArray(res.data) ? res.data : []).filter((m) => !m.read).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Failed to fetch inbox:", err);
      }
    };
    fetchUnread();
  }, [userId, userEmail]);
 
  // Fetch account
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const res = await api.get(`/auth/account/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setUsername(res.data.username || "");
        setCurrentUsername(res.data.username || "");
        setBio(res.data.bio || "");
        setProfilePic(res.data.profile_pic || null);
      } catch (err) {
        console.error("Failed to fetch account info:", err);
      } finally {
        setLoading(false);
      }
    };
    if (accessToken) fetchAccount();
  }, [accessToken]);

  useEffect(() => {
  if (!authLoading && !isLoggedIn) {
    navigate("/login");
  }
}, [isLoggedIn, authLoading, navigate]);

 
  if (loading) return <div className="p-6">Loading account…</div>;

 
  const TabBtn = ({ id, children }) => {
    const selected = activeTab === id;
    return (
      <button
        onClick={() => { setActiveTab(id); navigate(`#${id}`, { replace: true }); }}
        className={[
          "px-4 py-2 font-medium rounded-t border",
          selected
            ? "bg-[var(--bg-elev)] text-[var(--text)] border-[var(--border)]"
            : "text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--bg)_85%,transparent)] border-transparent",
        ].join(" ")}
      >
        {children}
        {id === "inbox" && unreadCount > 0 && (
          <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full align-middle">
            {unreadCount}
          </span>
        )}
      </button>
    );
  };
 
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 text-[var(--text)]">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-2">
        <TabBtn id="account">Account Settings</TabBtn>
        <TabBtn id="inbox">Inbox</TabBtn>
        <TabBtn id="daily">Daily Use</TabBtn>
      </div>
 
      {/* Panels */}
      {activeTab === "account" && (
        <div className="card space-y-6">
          <h1 className="text-2xl font-bold">Account Settings</h1>
 
          {/* Profile Picture */}
          <div className="space-y-2">
            <label className="block font-medium">Profile Picture</label>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm"
              onChange={() => {}}
            />
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                className="w-24 h-24 object-cover rounded-full border border-[var(--border)]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border border-[var(--border)] flex items-center justify-center text-sm text-[var(--muted)] bg-[var(--bg)]">
                No Image
              </div>
            )}
          </div>
 
          {/* Username */}
          <div className="space-y-2">
            <label className="block font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter new username"
              className="w-full bg-[var(--bg-elev)] text-[var(--text)] border border-[var(--border)] rounded-[calc(var(--radius)-8px)] px-3 py-2"
            />
            <button
              className="btn"
              onClick={() => {}}
              disabled={username === currentUsername}
              title={username === currentUsername ? "No changes" : "Update username"}
            >
              Update Username
            </button>
            {status && <p className="text-sm text-[var(--muted)]">{status}</p>}
          </div>
 
          {/* Bio */}
          <div className="space-y-2">
            <label className="block font-medium">Bio</label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Saving to database coming soon…"
              className="w-full bg-[var(--bg-elev)] text-[var(--text)] border border-[var(--border)] rounded-[calc(var(--radius)-8px)] px-3 py-2"
            />
          </div>
 
          {/* Phone number for SMS notifications */}
          <div className="space-y-2">
            <label className="block font-medium">Notifications</label>
            <PhoneNumberField />
            <StillnessNotifPrefs />
          </div>
 
          {/* Reset Password */}
{/* Reset Password */}
<div className="pt-2 space-y-2">
  <button
    className="btn btn-secondary"
    disabled={status === "reset_sending" || status === "reset_sent"}
    onClick={async () => {
      setStatus("reset_sending");
      try {
        await api.post("/auth/request-password-reset", { email: userEmail });
        setStatus("reset_sent");
      } catch {
        setStatus("reset_error");
      }
    }}
  >
    {status === "reset_sending" ? "Sending…" : "🔐 Send password reset email"}
  </button>
  {status === "reset_sent" && (
    <p className="text-sm text-[var(--muted)]">
      Check your email — click the link there to set a new password. You'll be logged out when you do.
    </p>
  )}
  {status === "reset_error" && (
    <p className="text-sm text-red-500">
      Something went wrong. Try again.
    </p>
  )}
</div>
          {/* Delete Account */}
<div className="pt-4 border-t border-[var(--border)]">
  {!showDeletePanel ? (
    <button
      className="btn btn-secondary"
      style={{ color: "salmon", borderColor: "salmon", opacity: 0.7 }}
      onClick={() => setShowDeletePanel(true)}
    >
      Delete Account
    </button>
  ) : (
    <div className="space-y-4 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
      <div>
        <p className="font-medium text-sm">Are you sure you want to delete your account?</p>
        <p className="text-sm opacity-60 mt-1">
          This permanently deletes your account, journal entries, stillness groups,
          and all other personal data. This cannot be undone.
        </p>
      </div>

      {/* Forge posts choice */}
      <div className="space-y-2">
        <p className="text-sm font-medium">What should happen to your Forge posts?</p>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            checked={deleteForge}
            onChange={() => setDeleteForge(true)}
          />
          Delete them permanently
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            checked={!deleteForge}
            onChange={() => setDeleteForge(false)}
          />
          Keep them — show as posted by "deleted user"
        </label>
      </div>

      {/* Confirmation input */}
      <div className="space-y-1">
        <p className="text-sm opacity-60">
          Type <strong>DELETE</strong> to confirm
        </p>
        <input
          type="text"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          placeholder="DELETE"
          className="w-full bg-[var(--bg-elev)] text-[var(--text)] border border-[var(--border)] rounded-[calc(var(--radius)-8px)] px-3 py-2"
        />
      </div>

      {deleteErr && (
        <p className="text-sm text-red-500">{deleteErr}</p>
      )}

      <div className="flex gap-2">
        <button
          className="btn"
          style={{ background: "salmon", borderColor: "salmon", color: "white" }}
          disabled={deleteConfirm !== "DELETE" || deleting}
          onClick={async () => {
            setDeleting(true);
            setDeleteErr("");
            try {
              await api.delete("/auth/account/delete", {
                data: {
                  confirmation: deleteConfirm,
                  delete_forge_posts: deleteForge,
                },
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              logout();
              window.location.href = "/";
            } catch (err) {
              setDeleteErr(
                err?.response?.data?.detail || "Something went wrong. Try again."
              );
            } finally {
              setDeleting(false);
            }
          }}
        >
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setShowDeletePanel(false);
            setDeleteConfirm("");
            setDeleteErr("");
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )}
</div>
        </div>
      )}
 
      {activeTab === "inbox" && (
        <div className="card p-0">
          <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
            <div className="font-semibold">Inbox</div>
            {unreadCount > 0 && (
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="p-3">
            <Inbox userEmail={userEmail} setUnreadCount={setUnreadCount} />
          </div>
        </div>
      )}
 
      {activeTab === "daily" && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Daily Use</h2>
            <button className="btn btn-secondary" onClick={refreshDaily}>⟳ Refresh</button>
          </div>
 
          {!userEmail ? (
            <div className="opacity-70">Log in to see and earn SEED.</div>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-3 rounded border" style={{ borderColor: "var(--border)" }}>
                  <div className="text-sm opacity-70">SEED Balance</div>
                  <div className="text-2xl font-bold mt-1">{seedBalance}</div>
                </div>
                <div className="p-3 rounded border" style={{ borderColor: "var(--border)" }}>
                  <div className="text-sm opacity-70">Earned Today</div>
                  <div className="text-2xl font-bold mt-1">{daily?.earned_today ?? 0}</div>
                </div>
                <div className="p-3 rounded border" style={{ borderColor: "var(--border)" }}>
                  <div className="text-sm opacity-70">Daily Cap</div>
                  <div className="text-2xl font-bold mt-1">{daily?.daily_cap ?? 30}</div>
                </div>
              </div>
 
              <div className="p-3 rounded border" style={{ borderColor: "var(--border)" }}>
                <div className="font-semibold mb-1">🎯 Today's Actions</div>
                <ul className="list-disc ml-6 space-y-2">
                  <li className="flex items-center justify-between">
                    <span>Post a journal entry (+5 SEED once per UTC day)</span>
                    <span className={"badge " + (daily?.journal_done_today ? "" : "opacity-70")}>
                      {daily?.journal_done_today ? "Done" : "Pending"}
                    </span>
                  </li>
                </ul>
                <div className="mt-3 flex gap-2">
                  <a href="/journal" className="btn">Go to Journal</a>
                  <a href="/TokenLedger" className="btn btn-secondary">View Ledger</a>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
 