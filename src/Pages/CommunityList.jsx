import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../authFetch";

const CommunityList = () => {
  const [communities, setCommunities] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await authFetch(`${import.meta.env.VITE_API_URL}/communities/list`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setCommunities(data);
      } catch (err) {
        console.error("Error:", err);
      }
    };

    fetchCommunities();
  }, []);

  const handleCreateCommunity = async () => {
    const name = prompt("Enter community name:");
    if (!name) return;
    const description = prompt("Enter community description:");
    const visibility = "public"; // or prompt for this later

    try {
      const res = await authFetch(`${import.meta.env.VITE_API_URL}/communities/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description, visibility }),
      });

      if (!res.ok) throw new Error("Failed to create");

      const newCommunity = await res.json();
      navigate(`/communities/${newCommunity.id}`);
    } catch (err) {
      console.error("Create Error:", err);
    }
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
            onClick={() => navigate(`/communities/${community.id}`)}
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