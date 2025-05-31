// src/pages/WeGreen.jsx
import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

const mockSuggestions = {
  spring: ["Lettuce", "Radishes", "Carrots", "Peas"],
  summer: ["Tomatoes", "Peppers", "Beans", "Basil"],
  fall: ["Garlic", "Spinach", "Turnips", "Broccoli"],
  winter: ["Cover Crops", "Garlic", "Kale", "Onions"],
};

const WeGreen = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [season, setSeason] = useState(null);

  const getSeason = (month) => {
    if ([11, 0, 1].includes(month)) return "winter";
    if ([2, 3, 4].includes(month)) return "spring";
    if ([5, 6, 7].includes(month)) return "summer";
    return "fall";
  };

  const handleCheck = () => {
    if (!location.trim()) return;
    const currentMonth = new Date().getMonth();
    const currentSeason = getSeason(currentMonth);
    setSeason(currentSeason);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 text-center dark:text-black">
      <h1 className="text-4xl font-bold mb-4">🌱 We Green</h1>
      <p className="mb-4 text-lg text-black dark:black">
        Empower your local garden. Plan. Grow. Share.
      </p>

      <input
        type="text"
        placeholder="Enter your city or postal code"
        className="w-full max-w-md p-2 border rounded mb-4 dark:bg-gray-100"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <Button onClick={handleCheck}>Check What To Plant</Button>

      {season && (
        <div className="mt-6 bg-green-100 dark:bg-green-900 p-4 rounded shadow text-left">
          <h2 className="text-xl font-semibold mb-2">
            🌸 Current Planting Season: {season.charAt(0).toUpperCase() + season.slice(1)}
          </h2>
          <ul className="list-disc ml-6">
            {mockSuggestions[season].map((plant, i) => (
              <li key={i}>{plant}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 text-left">
        <h2 className="text-2xl font-semibold mb-2">🛠 Upcoming Features</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li>📏 Garden Planner – Input space (sq ft), get optimized crop layout</li>
          <li>💧 Water Reminder System – Sync reminders based on weather</li>
          <li>🤝 Community Food Share – Connect with neighbors to trade/swap excess produce</li>
          <li>🗺️ Local Garden Map – Add and explore community gardens in your region</li>
        </ul>
      </div>

      <div className="mt-10">
        <Button onClick={() => navigate("/experiments")}>← Back to Experiments</Button>
      </div>
    </div>
  );
};

export default WeGreen;