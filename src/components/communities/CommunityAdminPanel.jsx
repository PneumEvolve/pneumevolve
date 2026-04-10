// src/components/communities/CommunityAdminPanel.jsx
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import CollapsibleComponent from "../ui/CollapsibleComponent";
 
export default function CommunityAdminPanel({
  communityId,
  currentUserId,
  creatorId,
  editMode,
  setEditMode,
  isAdmin,
}) {
  const { accessToken } = useAuth();
  const [pending, setPending] = useState([]);
  const [members, setMembers] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [open, setOpen] = useState(false);
 
  const canAdmin = currentUserId === creatorId || isAdmin;
 
  useEffect(() => {
    if (!canAdmin || !open || hasFetched) return;
    const fetchData = async () => {
      try {
        const [pendingRes, membersRes] = await Promise.all([
          api.get(`/communities/${communityId}/join-requests`),
          api.get(`/communities/${communityId}/full-members`),
        ]);
        setPending(pendingRes.data);
        setMembers(membersRes.data);
        setHasFetched(true);
      } catch (err) {
        console.error("Admin panel fetch error:", err);
      }
    };
    fetchData();
  }, [communityId, canAdmin, open, hasFetched]);
 
  const handleApprove = async (userId) => {
    await api.post(`/communities/${communityId}/members/${userId}/approve`, {});
    const approvedUser = pending.find((m) => m.user_id === userId);
    setPending((prev) => prev.filter((m) => m.user_id !== userId));
    setMembers((prev) => [...prev, approvedUser]);
  };
 
  const handleReject = async (userId) => {
    await api.post(
      `/communities/${communityId}/members/${userId}/approve?approve=false`,
      {}
    );
    setPending((prev) => prev.filter((m) => m.user_id !== userId));
  };
 
  const handleToggleAdmin = async (userId) => {
    try {
      const res = await api.put(
        `/communities/${communityId}/members/${userId}/toggle-admin`,
        {}
      );
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === userId ? { ...m, is_admin: res.data.is_admin } : m
        )
      );
    } catch (err) {
      console.error("Error toggling admin:", err);
    }
  };
 
  const handleRemove = async (userId) => {
    await api.delete(`/communities/${communityId}/members/${userId}`);
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  };
 
  const handleDeleteCommunity = async () => {
    if (!confirm("Delete this community for everyone?")) return;
    await api.delete(`/communities/${communityId}`);
    window.location.href = "/communities";
  };
 
  const displayName = (m) => m.user?.username || `User ${m.user_id}`;
 
  if (!accessToken || !communityId || !canAdmin) return null;
 
  return (
    <CollapsibleComponent title="🛠 Admin Tools">
      <div className="space-y-6">
        {/* Edit mode toggle */}
        <div>
          <button
            onClick={() => setEditMode((prev) => !prev)}
            className="btn btn-secondary"
          >
            {editMode ? "🔒 Exit edit mode" : "✏️ Edit community details"}
          </button>
        </div>
 
        {/* Pending requests */}
        <div className="space-y-2">
          <div className="section-bar">
            <h3 className="font-semibold text-sm">Pending requests</h3>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm opacity-60">No pending requests.</p>
          ) : (
            pending.map((m) => (
              <div key={m.user_id} className="card flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{displayName(m)}</span>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(m.user_id)}
                    className="btn text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(m.user_id)}
                    className="btn btn-secondary text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
 
        {/* Members */}
        <div className="space-y-2">
          <div className="section-bar">
            <h3 className="font-semibold text-sm">Members</h3>
          </div>
          {members.length === 0 ? (
            <p className="text-sm opacity-60">No approved members yet.</p>
          ) : (
            members.map((m) => (
              <div key={m.user_id} className="card flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{displayName(m)}</span>
                  {m.is_creator && (
                    <span className="badge text-xs">Creator</span>
                  )}
                  {m.is_admin && !m.is_creator && (
                    <span className="badge text-xs">Admin</span>
                  )}
                </div>
                {!m.is_creator && m.user_id !== currentUserId && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleAdmin(m.user_id)}
                      className="btn btn-secondary text-sm"
                    >
                      {m.is_admin ? "Remove admin" : "Make admin"}
                    </button>
                    <button
                      onClick={() => handleRemove(m.user_id)}
                      className="btn btn-secondary text-sm text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
 
        {/* Delete community — creator only */}
        {currentUserId === creatorId && (
          <div
            className="pt-4"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              onClick={handleDeleteCommunity}
              className="btn btn-secondary text-red-500"
            >
              🗑 Delete community
            </button>
          </div>
        )}
      </div>
    </CollapsibleComponent>
  );
}