// src/pages/Community.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

import CommunityGoals from "../components/communities/CommunityGoals";
import CommunityChat from "../components/communities/CommunityChat";
import ResourceBoard from "../components/communities/ResourceBoard";
import UpcomingEvents from "../components/communities/UpcomingEvents";
import MemberList from "../components/communities/MemberList";
import CommunityAdminPanel from "../components/communities/CommunityAdminPanel";
import ComponentManager from "../components/communities/ComponentManager";
import CollapsibleComponent from "../components/ui/CollapsibleComponent";

const API = import.meta.env.VITE_API_URL;

const defaultOrder = [
  "goals",
  "chat",
  "resources",
  "events",
  "members",
  "admin",
  "component_manager",
];

export default function Community() {
  const { communityId } = useParams();
  const { accessToken, userId } = useAuth();
  const [community, setCommunity] = useState(null);
  const [componentOrder, setComponentOrder] = useState(defaultOrder);
  const [editMode, setEditMode] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [joinRequested, setJoinRequested] = useState(false);

  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  useEffect(() => {
    if (!communityId || !accessToken) return;

    const fetchCommunity = async () => {
      try {
        const res = await axios.get(`${API}/communities/${communityId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const data = res.data;
        console.log("Fetched community data:", data);
        setCommunity(data);
        setEditedName(data.name);
        setEditedDescription(data.description || "");
        setComponentOrder(data.layout_config || defaultOrder);

        const member = data.members?.find(
          (m) => m.user_id === parseInt(userId)
        );

        if (member) {
          setIsApproved(member.is_approved);
          setIsAdmin(member.is_admin || userId === data.creator_id);
        } else {
          const existingRequest = data.join_requests?.find(
            (r) => r.user_id === parseInt(userId)
          );
          if (existingRequest) setJoinRequested(true);
        }
      } catch (err) {
        console.error("Error fetching community:", err);
      }
    };

    fetchCommunity();
  }, [communityId, accessToken, userId]);

  useEffect(() => {
  if (community) {
    const member = community.members?.find((m) => m.user_id === parseInt(userId));
    if (member) {
      setIsApproved(member.is_approved);
      setIsAdmin(member.is_admin || userId === community.creator_id);
    }
  }
}, [community, userId]);

  const handleJoinRequest = async () => {
    try {
      await axios.post(
        `${API}/communities/${communityId}/join`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setJoinRequested(true);
    } catch (err) {
      console.error("Failed to send join request:", err);
    }
  };

  const handleSaveOrder = (newOrder) => {
    setComponentOrder(newOrder);
  };

  const handleSaveCommunityDetails = async () => {
    try {
      const res = await axios.put(
        `${API}/communities/${communityId}`,
        {
          name: editedName,
          description: editedDescription,
          visibility: community.visibility,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      setCommunity(res.data);
      setEditMode(false);
    } catch (err) {
      console.error("Failed to save community details:", err);
    }
  };

  const renderComponent = (key) => {
    switch (key) {
      case "goals":
        return <CommunityGoals key="goals" communityId={communityId} />;
      case "chat":
        return <CommunityChat key="chat" communityId={communityId} isAdmin={isAdmin} />;
      case "resources":
        return <ResourceBoard key="resources" communityId={communityId} isAdmin={isAdmin} />;
      case "events":
        return <UpcomingEvents key="events" communityId={communityId} isAdmin={isAdmin} />;
      case "members":
        return <MemberList key="members" communityId={communityId} />;
      case "component_manager":
        return (
          <CollapsibleComponent key="component_manager" title="Component Manager">
            <ComponentManager
              communityId={communityId}
              currentOrder={componentOrder}
              onSave={handleSaveOrder}
              isAdmin={isAdmin}
            />
          </CollapsibleComponent>
        );
      case "admin":
  return (
    <CommunityAdminPanel
      key="admin"
      communityId={communityId}
      currentUserId={parseInt(userId)}
      creatorId={community.creator_id}
      editMode={editMode}
      setEditMode={setEditMode}
      isAdmin={isAdmin}
    />
  );
      default:
        return null;
    }
  };

  if (!community) {
    return <div className="p-6 text-gray-600">Loading community...</div>;
  }

  if (!isApproved) {
    return (
      <div className="p-6 text-center max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">{community.name}</h1>
        <p className="text-gray-700 mb-6">{community.description}</p>
        {joinRequested ? (
          <p className="text-blue-600">Join request sent. Waiting for approval.</p>
        ) : (
          <button
            onClick={handleJoinRequest}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Request to Join
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      {editMode ? (
        <>
          <input
            type="text"
            className="text-3xl font-bold mb-2 border p-2 w-full"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
          />
          <textarea
            className="text-gray-700 mb-4 border p-2 w-full"
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            rows={3}
          />
          <button
            className="bg-green-600 text-white px-4 py-2 rounded mr-3"
            onClick={handleSaveCommunityDetails}
          >
            Save
          </button>
          <button
            className="bg-gray-300 px-4 py-2 rounded"
            onClick={() => setEditMode(false)}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-2">{community.name}</h1>
          <p className="text-gray-700 mb-6">{community.description}</p>
          {isAdmin && (
            <button
              className="text-sm text-blue-600 mb-4"
              onClick={() => setEditMode(true)}
            >
              ✏️ Edit Community Info
            </button>
          )}
        </>
      )}

      {isAdmin && !componentOrder.includes("component_manager") && (
        <CollapsibleComponent title="Component Manager">
          <ComponentManager
            communityId={communityId}
            currentOrder={componentOrder}
            onSave={handleSaveOrder}
            isAdmin={isAdmin}
          />
        </CollapsibleComponent>
      )}

      <div className="flex flex-col gap-4">
        {componentOrder.map((key) => renderComponent(key))}
      </div>
    </div>
  );
}