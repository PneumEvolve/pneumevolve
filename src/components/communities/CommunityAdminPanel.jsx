import React, { useEffect, useState } from "react";
import { authFetch } from "../../authFetch";


const CommunityAdminPanel = ({ communityId, currentUserId, creatorId, editMode, setEditMode }) => {
  const [pending, setPending] = useState([]);
  const [members, setMembers] = useState([]);

  const isAdmin = currentUserId === creatorId;

  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      try {
        const [pendingRes, membersRes] = await Promise.all([
          authFetch(`${import.meta.env.VITE_API_URL}/communities/${communityId}/join-requests`),
          authFetch(`${import.meta.env.VITE_API_URL}/communities/${communityId}/members`),
        ]);

        if (pendingRes.ok) setPending(await pendingRes.json());
        if (membersRes.ok) setMembers(await membersRes.json());
      } catch (err) {
        console.error("Admin panel fetch error:", err);
      }
    };

    fetchData();
  }, [communityId, isAdmin]);

  const handleApprove = async (userId) => {
    await authFetch(`${import.meta.env.VITE_API_URL}/communities/${communityId}/members/${userId}/approve`, {
      method: "POST",
    });
    setPending(pending.filter((m) => m.user_id !== userId));
    setMembers([...members, { user_id: userId }]);
  };

  const handleReject = async (userId) => {
    await authFetch(`${import.meta.env.VITE_API_URL}/communities/${communityId}/members/${userId}/approve?approve=false`, {
      method: "POST",
    });
    setPending(pending.filter((m) => m.user_id !== userId));
  };

  const handleRemove = async (userId) => {
    await authFetch(`${import.meta.env.VITE_API_URL}/communities/${communityId}/members/${userId}`, {
      method: "DELETE",
    });
    setMembers(members.filter((m) => m.user_id !== userId));
  };

  const handleDeleteCommunity = async () => {
    if (!confirm("Are you sure you want to delete this community?")) return;

    await authFetch(`${import.meta.env.VITE_API_URL}/communities/${communityId}`, {
      method: "DELETE",
    });

    window.location.href = "/"; // or use navigate if available
  };

  if (!isAdmin) return null;

  return (
    <div className="mt-8 border rounded p-4 bg-red-50">
      <h2 className="text-xl font-bold mb-2">🛠 Admin Tools</h2>
<div className="flex justify-between items-center mb-4">
  <button
    onClick={() => setEditMode((prev) => !prev)}
    className="text-sm px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
  >
    {editMode ? "🔒 Exit Edit Mode" : "✏️ Edit Community"}
  </button>
</div>
      <div>
        <h3 className="font-semibold mb-1">Pending Requests</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-600">No pending requests.</p>
        ) : (
          pending.map((m) => (
            <div key={m.user_id} className="flex justify-between items-center mb-1">
              <span>User ID: {m.user_id}</span>
              <div className="space-x-2">
                <button onClick={() => handleApprove(m.user_id)} className="px-2 py-1 bg-green-600 text-white rounded text-sm">
                  Approve
                </button>
                <button onClick={() => handleReject(m.user_id)} className="px-2 py-1 bg-gray-500 text-white rounded text-sm">
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4">
        <h3 className="font-semibold mb-1">Approved Members</h3>
        {members.map((m) => (
          <div key={m.user_id} className="flex justify-between items-center mb-1">
            <span>User ID: {m.user_id}</span>
            <button onClick={() => handleRemove(m.user_id)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button onClick={handleDeleteCommunity} className="bg-red-800 text-white px-4 py-2 rounded">
          🗑 Delete Community
        </button>
      </div>
    </div>
  );
};

export default CommunityAdminPanel;