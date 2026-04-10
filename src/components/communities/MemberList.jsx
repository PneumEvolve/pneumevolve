// src/components/communities/MemberList.jsx
import React, { useState } from "react";
import { api } from "@/lib/api";
import CollapsibleComponent from "../ui/CollapsibleComponent";
 
export default function MemberList({ communityId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasFetched, setHasFetched] = useState(false);
 
  const fetchMembers = async () => {
    if (hasFetched || loading || !communityId) return;
    setLoading(true);
    try {
      const res = await api.get(`/communities/${communityId}/full-members`);
      setUsers(res.data || []);
      setHasFetched(true);
    } catch (err) {
      console.error("Failed to fetch members:", err);
      setError("Could not load members.");
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <CollapsibleComponent title="👥 Members">
      <div
        ref={(el) => { if (el && !hasFetched) fetchMembers(); }}
        className="space-y-2 pt-2"
      >
        {loading && (
          <div className="text-center opacity-60 text-sm py-4">Loading members…</div>
        )}
        {error && (
          <div className="text-center text-red-500 text-sm py-4">{error}</div>
        )}
        {!loading && !error && users.length === 0 && (
          <div className="text-center opacity-60 text-sm py-4">No members yet.</div>
        )}
        {!loading && !error && users.map((member) => {
          const displayName =
            member.user?.username || member.user?.email || `User ${member.user_id}`;
          return (
            <div
              key={member.user_id}
              className="card flex items-center justify-between gap-3"
            >
              <span className="text-sm font-medium">{displayName}</span>
              <div className="flex gap-2">
                {member.is_creator && (
                  <span className="badge">👑 Creator</span>
                )}
                {member.is_admin && !member.is_creator && (
                  <span className="badge">🔧 Admin</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </CollapsibleComponent>
  );
}