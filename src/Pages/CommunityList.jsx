// src/Pages/CommunityList.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Plus, Users, X } from "lucide-react";
 
export default function CommunityList() {
  const [communities, setCommunities] = useState([]);
  const [joined, setJoined] = useState([]);
  const [others, setOthers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
 
  const navigate = useNavigate();
  const { accessToken, userId } = useAuth();
 
  useEffect(() => {
    if (!accessToken) {
      navigate("/login");
      return;
    }
    fetchCommunities();
  }, [accessToken]);
 
  const fetchCommunities = async () => {
    try {
      const res = await api.get("/communities/list");
      const data = res.data;
      if (userId) {
        const numericId = parseInt(userId);
        const j = data.filter((c) =>
          c.members?.some((m) => m.user_id === numericId && m.is_approved)
        );
        const o = data.filter((c) => !j.some((jc) => jc.id === c.id));
        setJoined(j);
        setOthers(o);
      } else {
        setOthers(data);
      }
    } catch (err) {
      console.error("Error fetching communities:", err);
    }
  };
 
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post("/communities/create", {
        name: newName.trim(),
        description: newDescription.trim(),
        visibility: "public",
      });
      navigate(`/communities/${res.data.id}`);
    } catch (err) {
      console.error("Error creating community:", err);
      alert("Failed to create community.");
    } finally {
      setCreating(false);
    }
  };
 
  const CommunityCard = ({ community }) => (
    <button
      onClick={() => navigate(`/communities/${community.id}`)}
      className="card w-full text-left hover:shadow-lg transition space-y-1"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-lg truncate">{community.name}</h2>
        {community.members?.length > 0 && (
          <span className="badge shrink-0">
            {community.members.length} {community.members.length === 1 ? "member" : "members"}
          </span>
        )}
      </div>
      {community.description && (
        <p className="text-sm opacity-60 line-clamp-2">{community.description}</p>
      )}
    </button>
  );
 
  return (
    <main className="main p-6 space-y-6">
      {/* Header */}
      <section className="card flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 opacity-60" />
          <h1 className="text-2xl font-bold">Communities</h1>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="btn shrink-0"
        >
          {showCreate ? <X className="h-4 w-4 mr-1 inline" /> : <Plus className="h-4 w-4 mr-1 inline" />}
          {showCreate ? "Cancel" : "New community"}
        </button>
      </section>
 
      {/* Create form */}
      {showCreate && (
        <section className="card space-y-4">
          <h2 className="font-semibold">Create a community</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs opacity-60 font-medium">Name</label>
              <input
                className="input w-full"
                placeholder="Community name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                maxLength={100}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs opacity-60 font-medium">Description</label>
              <textarea
                className="input w-full"
                placeholder="What is this community about?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={creating || !newName.trim()} className="btn">
                {creating ? "Creating…" : "Create community"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
 
      {/* Joined communities */}
      {joined.length > 0 && (
        <section className="space-y-3">
          <div className="section-bar">
            <h2 className="font-semibold">Your communities</h2>
          </div>
          {joined.map((c) => <CommunityCard key={c.id} community={c} />)}
        </section>
      )}
 
      {/* Other communities */}
      <section className="space-y-3">
        <div className="section-bar">
          <h2 className="font-semibold">
            {joined.length > 0 ? "Other communities" : "All communities"}
          </h2>
        </div>
        {others.length === 0 ? (
          <div className="card text-center opacity-60 text-sm">
            No other communities yet.
          </div>
        ) : (
          others.map((c) => <CommunityCard key={c.id} community={c} />)
        )}
      </section>
    </main>
  );
}