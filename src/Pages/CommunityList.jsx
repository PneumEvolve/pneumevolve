import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const CommunityList = () => {
  const [communities, setCommunities] = useState([]);
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [otherCommunities, setOtherCommunities] = useState([]);
  const navigate = useNavigate();
  const { accessToken, userId } = useAuth();

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await axios.get(`${API}/communities/list`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });

        const data = res.data;

        if (accessToken && userId) {
          const numericUserId = parseInt(userId);
          const joined = data.filter((c) =>
            c.members?.some(
              (m) => m.user_id === numericUserId && m.is_approved
            )
          );
          const others = data.filter(
            (c) => !joined.some((jc) => jc.id === c.id)
          );

          setJoinedCommunities(joined);
          setOtherCommunities(others);
        } else {
          setOtherCommunities(data);
        }
      } catch (err) {
        console.error("Error fetching communities:", err);
      }
    };

    fetchCommunities();
  }, [accessToken, userId]);

  const handleCreateCommunity = async () => {
    const name = prompt("Enter community name:");
    if (!name) return;
    const description = prompt("Enter community description:");
    const visibility = "public";

    try {
      const res = await axios.post(
        `${API}/communities/create`,
        { name, description, visibility },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      navigate(`/communities/${res.data.id}`);
    } catch (err) {
      console.error("Error creating community:", err);
    }
  };

  const renderCommunity = (community) => (
    <div
      key={community.id}
      className="border p-4 rounded hover:bg-gray-50 cursor-pointer"
      onClick={() => navigate(`/communities/${community.id}`)}
    >
      <h2 className="font-semibold text-lg">{community.name}</h2>
      <p className="text-sm text-gray-700">{community.description}</p>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Communities</h1>
      {accessToken && (
        <button
          className="mb-4 bg-green-600 text-white px-4 py-2 rounded"
          onClick={handleCreateCommunity}
        >
          + Create New Community
        </button>
      )}

      {joinedCommunities.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Your Communities</h2>
          <div className="space-y-3">
            {joinedCommunities.map(renderCommunity)}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-2">Other Communities</h2>
      <div className="space-y-3">
        {otherCommunities.map(renderCommunity)}
      </div>
    </div>
  );
};

export default CommunityList;
