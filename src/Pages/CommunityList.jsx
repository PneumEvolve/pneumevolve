import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const CommunityList = () => {
  const [communities, setCommunities] = useState([
    { id: 1, name: "New Earth Tribe", description: "A space for dreamers and builders." },
    { id: 2, name: "Tech Rebels", description: "People disrupting old systems with new tools." },
  ]);

  const navigate = useNavigate();

  const handleCreateCommunity = () => {
    const name = prompt("Enter community name:");
    if (!name) return;
    const description = prompt("Enter community description:");
    const newCommunity = {
      id: Date.now(),
      name,
      description,
    };
    setCommunities((prev) => [...prev, newCommunity]);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Your Communities</h1>
      <button
        className="mb-4 bg-green-600 text-white px-4 py-2 rounded"
        onClick={handleCreateCommunity}
      >
        + Create New Community
      </button>
      <div className="space-y-3">
        {communities.map((community) => (
          <div
            key={community.id}
            className="border p-4 rounded hover:bg-gray-50 cursor-pointer"
            onClick={() => navigate(`/communities/${community.id}`, { state: { community } })}
          >
            <h2 className="font-semibold text-lg">{community.name}</h2>
            <p className="text-sm text-gray-700">{community.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunityList;