import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

export default function MemberList({ communityId }) {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [creatorId, setCreatorId] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      if (!accessToken || !communityId) return;

      try {
        setLoading(true);
        setError("");

        // 1. Get community to find creator_id
        const communityRes = await axios.get(`${API}/communities/${communityId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const creatorId = communityRes.data.creator_id;
        setCreatorId(creatorId);

        // 2. Get approved members
        const memberRes = await axios.get(`${API}/communities/${communityId}/members`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        let userIds = memberRes.data.map((m) => m.user_id);

        // 3. Include creator
        if (!userIds.includes(creatorId)) {
          userIds.unshift(creatorId);
        }

        // 4. Fetch account details for each user
        const userDetails = await Promise.all(
          userIds.map(async (uid) => {
            try {
              const res = await axios.get(`${API}/auth/account/${uid}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              return { ...res.data, user_id: uid };
            } catch (err) {
              console.warn(`Error fetching user ${uid}:`, err);
              return { user_id: uid, email: `Unknown (${uid})` };
            }
          })
        );

        setUsers(userDetails);
      } catch (err) {
        console.error("Failed to fetch members:", err);
        setError("Unable to load members.");
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [communityId, accessToken]);

  const renderUser = (user) => {
    const displayName = user.username || user.email || `User ${user.user_id}`;
    const isCreator = user.user_id === creatorId;

    return (
      <li
        key={user.user_id}
        className={`border p-2 rounded text-sm ${
          isCreator ? "bg-yellow-50" : "bg-gray-50"
        }`}
      >
        {displayName}
        {isCreator && <span className="ml-2 text-xs text-yellow-700 font-semibold">👑 Admin</span>}
      </li>
    );
  };

  return (
    <div className="mt-6 border rounded shadow bg-white">
      <button
        onClick={() => setCollapsed((prev) => !prev)}
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
            <ul className="space-y-2">
              {users.map((user) => renderUser(user))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}