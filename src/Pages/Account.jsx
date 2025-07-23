import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Inbox from "@/components/dashboard/Inbox"; // ✅
import supabase from "@/utils/supabaseClient";

const API = import.meta.env.VITE_API_URL;

export default function Account() {
  const { accessToken, userId } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [unreadCount, setUnreadCount] = useState(0);

  // Your existing account state (username, bio, etc.)
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  localStorage.setItem("unreadCount", unreadCount);
  window.dispatchEvent(new Event("storage")); // trigger sync
}, [unreadCount]);

  // Fetch unread count on load
  useEffect(() => {
    const fetchUnread = async () => {
      if (!userId) return;
      try {
        const res = await axios.get(`${API}/inbox/${userId}`);
        const unread = res.data.filter((msg) => !msg.read).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Failed to fetch inbox:", err);
      }
    };

    fetchUnread();
  }, [userId]);

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
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch account info:", err);
        setLoading(false);
      }
    };

    if (accessToken) fetchAccount();
  }, [accessToken]);

  if (loading) return <div className="p-6">Loading account...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">

      {/* 🔥 Tabs */}
      <div className="flex space-x-4 border-b pb-2 mb-6">
        <button
          onClick={() => setActiveTab("account")}
          className={`px-4 py-2 font-medium rounded-t ${
            activeTab === "account" ? "bg-white dark:bg-zinc-800 border" : "text-gray-500"
          }`}
        >
          Account Settings
        </button>
        <button
          onClick={() => setActiveTab("inbox")}
          className={`px-4 py-2 font-medium rounded-t relative ${
            activeTab === "inbox" ? "bg-white dark:bg-zinc-800 border" : "text-gray-500"
          }`}
        >
          Inbox
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 🔁 Content based on tab */}
      {activeTab === "account" && (
        <>
          {/* Your original account content below... */}
          <h1 className="text-3xl font-bold">Account Settings</h1>

          {/* Profile Pic Upload */}
          <div className="space-y-2">
            <label className="block font-medium">Profile Picture</label>
            <input type="file" accept="image/*" onChange={() => {}} />
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                className="w-24 h-24 object-cover rounded-full border"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border flex items-center justify-center text-sm text-gray-500">
                No Image
              </div>
            )}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="block font-medium">Username</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter new username"
            />
            <Button onClick={() => {}} disabled={username === currentUsername}>
              Update Username!
            </Button>
            {status && <p className="text-sm text-gray-600">{status}</p>}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="block font-medium">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Saving to database coming soon..."
              rows={4}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          {/* Reset Password */}
          <div className="pt-4">
            <Button variant="outline" onClick={() => alert("Password reset coming soon!")}>
              🔐 Reset Password - Coming Soon
            </Button>
          </div>
        </>
      )}

      {activeTab === "inbox" && (
        <div className="pt-2">
          <Inbox userId={userId} setUnreadCount={setUnreadCount} />
        </div>
      )}
    </div>
  );
}