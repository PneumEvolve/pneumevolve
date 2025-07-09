import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { authFetch } from "../authFetch";
import { useAuth } from "../context/AuthContext";
import CommunityAdminPanel from "../components/communities/CommunityAdminPanel";

const Community = () => {
  const { id } = useParams();
  const { userId } = useAuth();
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Editable fields
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  useEffect(() => {
    const fetchCommunity = async () => {
      try {
        const res = await authFetch(
          `${import.meta.env.VITE_API_URL}/communities/${id}`
        );
        const data = await res.json();
        setCommunity(data);
        setMembers(data.members || []);
        setEditedName(data.name);
        setEditedDescription(data.description);

        const numericUserId = parseInt(userId);
        const userIsAdmin = numericUserId === data.creator_id;
        const userIsMember = data.members?.some(
          (member) =>
            member.user_id === numericUserId && member.is_approved
        );

        setIsAdmin(userIsAdmin);
        setIsMember(userIsMember || userIsAdmin);
      } catch (err) {
        console.error("Error loading community:", err);
      }
    };

    fetchCommunity();
  }, [id, userId]);

  const handleJoin = async () => {
    try {
      const res = await authFetch(
        `${import.meta.env.VITE_API_URL}/communities/${id}/join`,
        { method: "POST" }
      );
      if (res.ok) {
        setRequestSent(true);
      } else {
        console.error("Failed to request to join.");
      }
    } catch (err) {
      console.error("Error joining community:", err);
    }
  };

  const handleSave = async () => {
  try {
    const response = await authFetch(`${import.meta.env.VITE_API_URL}/communities/${community.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: editedName,
        description: editedDescription,
        visibility: "public", // Hardcoded for now
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save community edits.");
    }

    const updated = await response.json();
    setCommunity(updated);
    setEditMode(false);
  } catch (error) {
    console.error("Error saving community:", error);
    alert("Error saving community.");
  }
};

  if (!community) return <div>Loading...</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {editMode ? (
        <>
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="text-3xl font-bold mb-2 w-full border p-2 rounded"
          />
          <textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            rows={4}
          />
          <button
            onClick={handleSave}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Save Changes
          </button>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold">{community.name}</h1>
          <p className="text-gray-600 mb-4">{community.description}</p>
        </>
      )}

      {/* Admin Panel */}
      {isAdmin && (
        <>
          <p className="text-green-700 font-semibold">👑 You are an admin</p>
          <CommunityAdminPanel
            communityId={community.id}
            currentUserId={parseInt(userId)}
            creatorId={community.creator_id}
            editMode={editMode}
            setEditMode={setEditMode}
          />
        </>
      )}

      {/* Join Button for non-members */}
      {!isMember && !isAdmin && (
        <div className="mt-4">
          {requestSent ? (
            <p className="text-green-600 font-medium">Request sent!</p>
          ) : (
            <button
              onClick={handleJoin}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Request to Join
            </button>
          )}
        </div>
      )}

      {/* Member view confirmation */}
      {isMember && !isAdmin && (
        <p className="text-blue-700 mt-4">
          ✅ You are a member of this community
        </p>
      )}
    </div>
  );
};

export default Community;