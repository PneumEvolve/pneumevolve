import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "../../context/AuthContext";

const CommunityAdminPanel = ({ communityId, currentUserId, creatorId, editMode, setEditMode, isAdmin }) => {
  const [collapsed, setCollapsed] = useState(true);
  const [pending, setPending] = useState([]);
  const [members, setMembers] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);
  const { accessToken } = useAuth();

  const canAdmin = currentUserId === creatorId || isAdmin;

  useEffect(() => {
    if (!canAdmin || collapsed || hasFetched) return;

    const fetchData = async () => {
      try {
        const [pendingRes, membersRes] = await Promise.all([
          api.get(`/communities/${communityId}/join-requests`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          api.get(`/communities/${communityId}/full-members`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);

        setPending(pendingRes.data);
        setMembers(membersRes.data);
        console.log("Fetched Members:", membersRes.data);
        const creator = membersRes.data.find((m) => m.is_creator);
        console.log("Identified Creator:", creator);
        setHasFetched(true);
      } catch (err) {
        console.error("Admin panel fetch error:", err);
      }
    };

    fetchData();
  }, [communityId, isAdmin, accessToken, collapsed, hasFetched]);

  const handleApprove = async (userId) => {
    await api.post(
      `/communities/${communityId}/members/${userId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const approvedUser = pending.find((m) => m.user_id === userId);
    setPending(pending.filter((m) => m.user_id !== userId));
    setMembers([...members, approvedUser]);
  };

  const handleReject = async (userId) => {
    await api.post(
      `/communities/${communityId}/members/${userId}/approve?approve=false`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    setPending(pending.filter((m) => m.user_id !== userId));
  };

  const handleToggleAdmin = async (userId) => {
    try {
      const res = await api.put(
        `/communities/${communityId}/members/${userId}/toggle-admin`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === userId ? { ...m, is_admin: res.data.is_admin } : m
        )
      );
    } catch (err) {
      console.error("Error toggling admin status:", err);
    }
  };

  const handleRemove = async (userId) => {
    await api.delete(`/communities/${communityId}/members/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setMembers(members.filter((m) => m.user_id !== userId));
  };

  const handleDeleteCommunity = async () => {
    if (!confirm("Are you sure you want to delete this community?")) return;

    await api.delete(`/communities/${communityId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    window.location.href = "/";
  };

  const displayName = (m) => {
  if (m.user?.username) return m.user.username;
  return `User ID: ${m.user_id}`;
};

if (!accessToken || !communityId) return null;

return (
  <div className="mt-8 border rounded p-4 bg-red-50">
    <div className="flex justify-between items-center mb-2">
      <h2 className="text-xl font-bold">🛠 Admin Tools</h2>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="text-sm bg-gray-200 px-3 py-1 rounded"
      >
        {collapsed ? "➕" : "➖"}
      </button>
    </div>

    {!collapsed && (
      <>
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setEditMode((prev) => !prev)}
            className="text-sm px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {editMode ? "🔒 Exit Edit Mode" : "✏️ Edit Community"}
          </button>
        </div>

        {/* Pending Requests */}
        <div>
          <h3 className="font-semibold mb-1">Pending Requests</h3>
          {pending.length === 0 ? (
            <p className="text-sm text-gray-600">No pending requests.</p>
          ) : (
            pending.map((m) => (
              <div key={m.user_id} className="flex justify-between items-center mb-1">
                <span>{displayName(m)}</span>
                <div className="space-x-2">
                  <button
                    onClick={() => handleApprove(m.user_id)}
                    className="px-2 py-1 bg-green-600 text-white rounded text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(m.user_id)}
                    className="px-2 py-1 bg-gray-500 text-white rounded text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Approved Members */}
        <div className="mt-4">
          <h3 className="font-semibold mb-1">Approved Members</h3>
          {members.length === 0 ? (
            <p className="text-sm text-gray-600">No approved members yet.</p>
          ) : (
            members.map((m) => (
              <div key={m.user_id} className="flex justify-between items-center mb-1">
                <span>
                  {displayName(m)}{" "}
                  {m.is_creator && (
                    <span className="text-xs text-purple-600 ml-1">(Creator)</span>
                  )}
                  {m.is_admin && !m.is_creator && (
                    <span className="text-xs text-yellow-600 ml-1">(Admin)</span>
                  )}
                </span>
                <div className="space-x-2">
                  {!m.is_creator && m.user_id !== currentUserId && (
  <>
    <button
      onClick={() => handleToggleAdmin(m.user_id)}
      className={`px-2 py-1 rounded text-sm ${
        m.is_admin ? "bg-yellow-600" : "bg-green-700"
      } text-white`}
    >
      {m.is_admin ? "Remove Admin" : "Make Admin"}
    </button>
    <button
      onClick={() => handleRemove(m.user_id)}
      className="px-2 py-1 bg-red-600 text-white rounded text-sm"
    >
      Remove
    </button>
  </>
)}
                </div>
              </div>
            ))
          )}
        </div>

        {currentUserId === creatorId && (
  <div className="mt-6">
    <button
      onClick={handleDeleteCommunity}
      className="bg-red-800 text-white px-4 py-2 rounded"
    >
      🗑 Delete Community
    </button>
  </div>
)}
      </>
    )}
  </div>
);
};

export default CommunityAdminPanel;