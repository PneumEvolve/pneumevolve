import React from "react";
import { useLocation } from "react-router-dom";

const Community = () => {
  const location = useLocation();
  const community = location.state?.community;

  if (!community) return <div className="p-6">Community not found.</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">{community.name}</h1>
      <p className="mb-6 text-gray-600">{community.description}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">🗣 Forum</h2>
          <p className="text-sm text-gray-600">Placeholder for discussion threads.</p>
        </div>
        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">📋 Projects</h2>
          <p className="text-sm text-gray-600">Community project planner goes here.</p>
        </div>
        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">🌱 Garden/Food Tools</h2>
          <p className="text-sm text-gray-600">Future food/seed exchange or garden tracking.</p>
        </div>
        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">🧠 Dreamspace</h2>
          <p className="text-sm text-gray-600">Shared vision board or manifesto module.</p>
        </div>
      </div>
    </div>
  );
};

export default Community;