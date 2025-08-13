// src/pages/Account.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import Inbox from "@/components/dashboard/Inbox";

const API = import.meta.env.VITE_API_URL;

export default function Account() {
  const { accessToken, userId, userEmail } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [unreadCount, setUnreadCount] = useState(0);

  // Account state
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem("unreadCount", unreadCount);
    window.dispatchEvent(new Event("storage")); // keep header badge in sync
  }, [unreadCount]);

  // Fetch unread count
  useEffect(() => {
    const fetchUnread = async () => {
      if (!userId || !userEmail) return;
      try {
        const res = await axios.get(`${API}/inbox/${encodeURIComponent(userEmail)}`);
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
        const res = await axios.get(`${API}/auth/account/me`, {
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

  if (loading) return <div className="p-6">Loading account…</div>;

  const TabBtn = ({ id, children }) => {
    const selected = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
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

          {/* Reset Password */}
          <div className="pt-2">
            <button
              className="btn btn-secondary"
              onClick={() => alert("Password reset coming soon!")}
            >
              🔐 Reset Password — Coming Soon
            </button>
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
    </div>
  );
}