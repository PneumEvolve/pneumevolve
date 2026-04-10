// src/Pages/Community.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
 
import CommunityGoals from "../components/communities/CommunityGoals";
import CommunityChat from "../components/communities/CommunityChat";
import ResourceBoard from "../components/communities/ResourceBoard";
import UpcomingEvents from "../components/communities/UpcomingEvents";
import MemberList from "../components/communities/MemberList";
import CommunityAdminPanel from "../components/communities/CommunityAdminPanel";
import ComponentManager from "../components/communities/ComponentManager";
import CollapsibleComponent from "../components/ui/CollapsibleComponent";
 
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
  const navigate = useNavigate();
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
        const res = await api.get(`/communities/${communityId}`);
        const data = res.data;
        setCommunity(data);
        setEditedName(data.name);
        setEditedDescription(data.description || "");
        setComponentOrder(data.layout_config || defaultOrder);
 
        const member = data.members?.find((m) => m.user_id === parseInt(userId));
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
      await api.post(`/communities/${communityId}/join`, {});
      setJoinRequested(true);
    } catch (err) {
      console.error("Failed to send join request:", err);
    }
  };
 
  const handleSaveCommunityDetails = async () => {
    try {
      const res = await api.put(`/communities/${communityId}`, {
        name: editedName,
        description: editedDescription,
        visibility: community.visibility,
      });
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
              onSave={(newOrder) => setComponentOrder(newOrder)}
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
    return (
      <main className="main p-6">
        <div className="card text-center opacity-60 text-sm">Loading community…</div>
      </main>
    );
  }
 
  if (!isApproved) {
    return (
      <main className="main p-6 space-y-6">
        <section className="card text-center space-y-4">
          <h1 className="text-2xl font-bold">{community.name}</h1>
          {community.description && (
            <p className="opacity-70">{community.description}</p>
          )}
          {joinRequested ? (
            <p className="text-sm opacity-60">
              Join request sent. Waiting for approval.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm opacity-60">
                This community requires approval to join.
              </p>
              <button onClick={handleJoinRequest} className="btn">
                Request to join
              </button>
            </div>
          )}
          <button
            onClick={() => navigate("/communities")}
            className="btn btn-secondary"
          >
            ← Communities
          </button>
        </section>
      </main>
    );
  }
 
  return (
    <main className="main p-6 space-y-6">
      {/* Header */}
      <section className="card space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <button
            onClick={() => navigate("/communities")}
            className="btn btn-secondary text-sm"
          >
            ← Communities
          </button>
          {isAdmin && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="btn btn-secondary text-sm"
            >
              ✏️ Edit
            </button>
          )}
        </div>
 
        {editMode ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs opacity-60 font-medium">Community name</label>
              <input
                className="input w-full text-xl font-bold"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs opacity-60 font-medium">Description</label>
              <textarea
                className="input w-full"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveCommunityDetails} className="btn">
                Save
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{community.name}</h1>
            {community.description && (
              <p className="opacity-70">{community.description}</p>
            )}
          </>
        )}
      </section>
 
      {/* Admin component manager fallback */}
      {isAdmin && !componentOrder.includes("component_manager") && (
        <CollapsibleComponent title="Component Manager">
          <ComponentManager
            communityId={communityId}
            currentOrder={componentOrder}
            onSave={(newOrder) => setComponentOrder(newOrder)}
            isAdmin={isAdmin}
          />
        </CollapsibleComponent>
      )}
 
      {/* Ordered components */}
      <div className="flex flex-col gap-4">
        {componentOrder.map((key) => renderComponent(key))}
      </div>
    </main>
  );
}