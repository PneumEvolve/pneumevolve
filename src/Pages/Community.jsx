import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import CommunityAdminPanel from "../components/communities/CommunityAdminPanel";
import CommunityGoals from "../components/communities/CommunityGoals";
import CommunityChat from "../components/communities/CommunityChat";
import ResourceBoard from "../components/communities/ResourceBoard";
import UpcomingEvents from "../components/communities/UpcomingEvents";
import MemberList from "../components/communities/MemberList";

const API = import.meta.env.VITE_API_URL;

const Community = () => {
  const { id } = useParams();
  const { accessToken, userId } = useAuth();
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  const [visibility, setVisibility] = useState({
    goals: true,
    chat: true,
    resources: true,
    events: true,
    members: true,
  });

  useEffect(() => {
  const fetchCommunityAndMembers = async () => {
    try {
      // Fetch community details
      const communityRes = await axios.get(`${API}/communities/${id}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const communityData = communityRes.data;
      setCommunity(communityData);
      setEditedName(communityData.name);
      setEditedDescription(communityData.description);

      setVisibility({
        goals: communityData.show_goals ?? true,
        chat: communityData.show_chat ?? true,
        resources: communityData.show_resources ?? true,
        events: communityData.show_events ?? true,
        members: communityData.show_members ?? true,
      });

      // Fetch APPROVED members only
      const membersRes = await axios.get(`${API}/communities/${id}/members`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const approvedMembers = membersRes.data;
      setMembers(approvedMembers);

      if (accessToken && userId) {
        const numericUserId = parseInt(userId);
        console.log("Logged in userId:", userId, "numericUserId:", numericUserId);

        const userIsAdmin = numericUserId === communityData.creator_id;
        const userIsMember = approvedMembers.some(
          (member) => parseInt(member.user_id) === numericUserId
        );

        console.log("User is member?", userIsMember);
        setIsAdmin(userIsAdmin);
        setIsMember(userIsMember || userIsAdmin);
      }
    } catch (err) {
      console.error("Error loading community or members:", err);
    }
  };

  fetchCommunityAndMembers();
}, [id, accessToken, userId]);

  const handleJoin = async () => {
    try {
      const res = await axios.post(
        `${API}/communities/${id}/join`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.status === 200) {
        setRequestSent(true);
      }
    } catch (err) {
      console.error("Error joining community:", err);
    }
  };

  const handleSave = async () => {
    try {
      const response = await axios.put(
        `${API}/communities/${community.id}`,
        {
          name: editedName,
          description: editedDescription,
          visibility: "public",
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      setCommunity(response.data);
      setEditMode(false);
    } catch (error) {
      console.error("Error saving community:", error);
      alert("Error saving community.");
    }
  };

  if (!community) return <div>Loading...</div>;

  return (
    <div className="p-4 max-w-5xl mx-auto">
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

      {isAdmin && (
        <>
          <p className="text-green-700 font-semibold">👑 You are an admin</p>
          <CommunityAdminPanel
            communityId={community.id}
            currentUserId={parseInt(userId)}
            creatorId={community.creator_id}
            editMode={editMode}
            setEditMode={setEditMode}
            visibility={visibility}
            setVisibility={setVisibility}
          />
        </>
      )}

      {!isMember && !isAdmin && accessToken && (
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

      {isMember && !isAdmin && (
        <p className="text-blue-700 mt-4">
          ✅ You are a member of this community
        </p>
      )}

      {isMember && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <CommunityGoals communityId={community.id} visible={visibility.goals} />
          <CommunityChat communityId={community.id} visible={visibility.chat} />
          <ResourceBoard communityId={community.id} visible={visibility.resources} />
          <UpcomingEvents communityId={community.id} visible={visibility.events} />
          <MemberList communityId={community.id} visible={visibility.members} />
        </div>
      )}
    </div>
  );
};

export default Community;