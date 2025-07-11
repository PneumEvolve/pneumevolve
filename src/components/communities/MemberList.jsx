// src/components/community/MemberList.jsx
import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

export default function MemberList({ communityId }) {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [collapsed, setCollapsed] = useState(true); // ✅ start collapsed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasFetched, setHasFetched] = useState(false); // ✅ prevent re-fetching

  const toggleCollapse = async () => {
    const next = !collapsed;
    setCollapsed(next);

    if (next || hasFetched || !accessToken || !communityId) return;

    try {
      setLoading(true);
      const res = await axios.get(`${API}/communities/${communityId}/full-members`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setUsers(res.data || []);
      setHasFetched(true); // ✅ mark as fetched
    } catch (err) {
      console.error("Failed to fetch full member list:", err);
      setError("Could not load members.");
    } finally {
      setLoading(false);
    }
  };

  const renderUser = (user) => {
    const displayName = user.username || user.email || `User ${user.user_id}`;
    return (
      <li
        key={user.user_id}
        className={`border p-2 rounded text-sm ${
          user.is_creator ? "bg-yellow-50" : "bg-gray-50"
        }`}
      >
        {displayName}
        {user.is_creator && (
          <span className="ml-2 text-xs text-yellow-700 font-semibold">👑 Admin</span>
        )}
      </li>
    );
  };

  return (
    <div className="mt-6 border rounded shadow bg-white">
      <button
        onClick={toggleCollapse}
        className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 font-bold text-lg flex justify-between items-center"
      >
        <span>👥 Members</span>
        <span>{collapsed ? "➕" : "➖"}</span>
      </button>

      {!collapsed && (
        <div className="p-4">
          {loading && <p className="text-gray-500">Loading members...</p>}
          {error && <p className="text-red-600">{error}</p>}
          {!loading && !error && (
            <ul className="space-y-2">{users.map(renderUser)}</ul>
          )}
        </div>
      )}
    </div>
  );
}