// GardenDirectory.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const GardenDirectory = () => {
  const [gardens, setGardens] = useState([]);

  // Placeholder fetch – replace with Supabase call later
  useEffect(() => {
    setGardens([
      {
        id: 1,
        type: "Blitz",
        hostName: "Jamie R.",
        location: "East Hill",
        status: "Scheduled",
        notes: "Needs help with raised beds & soil delivery",
      },
      {
        id: 2,
        type: "Ongoing",
        hostName: "Ava B.",
        location: "BX Ranch",
        status: "In Progress",
        notes: "Looking for weekly watering & weeding support",
      },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-center">🌾 Garden Directory</h1>
        <p className="text-center text-lg">
          Browse local gardens that are part of the Garden Blitz and Ongoing Support program.
        </p>

        <div className="text-center">
          <Link
            to="/gardenblitz"
            className="inline-block mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium px-5 py-3 rounded-xl shadow hover:shadow-md transition"
          >
            ← Back to Garden Blitz
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
          {gardens.map((garden) => (
            <div
              key={garden.id}
              className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl shadow space-y-2"
            >
              <h2 className="text-xl font-semibold">
                {garden.hostName} — {garden.type}
              </h2>
              <p>
                <strong>Location:</strong> {garden.location}
              </p>
              <p>
                <strong>Status:</strong> {garden.status}
              </p>
              <p>
                <strong>Notes:</strong> {garden.notes}
              </p>
              <button className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition">
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GardenDirectory;