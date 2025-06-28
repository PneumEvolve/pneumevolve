// GardenDirectory.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "../utils/supabaseClient"; // Make sure this path matches your project setup

const GardenDirectory = () => {
  const [gardens, setGardens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const fetchGardens = async () => {
      const { data, error } = await supabase.from("gardens").select("*").order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching gardens:", error.message);
      } else {
  setGardens(data);
  setLocations(["All", ...new Set(data.map((g) => g.location).filter(Boolean))]);
}
      setLoading(false);
    };

    fetchGardens();
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

<div className="text-center mb-4 space-x-4">
  <label className="mr-2 font-medium">Filter by Type:</label>
  <select
    value={filter}
    onChange={(e) => setFilter(e.target.value)}
    className="border rounded px-3 py-1 bg-white dark:bg-gray-800"
  >
    <option value="All">Show All</option>
    <option value="Blitz Host">🌿 Blitz Host</option>
    <option value="Blitz Volunteer">💪 Blitz Volunteer</option>
    <option value="Long-Term Host">🌻 Long-Term Host</option>
    <option value="Long-Term Volunteer">🌾 Long-Term Volunteer</option>
  </select>

  <label className="ml-6 mr-2 font-medium">Location:</label>
  <select
    value={locationFilter}
    onChange={(e) => setLocationFilter(e.target.value)}
    className="border rounded px-3 py-1 bg-white dark:bg-gray-800"
  >
    {locations.map((loc, idx) => (
      <option key={idx} value={loc}>
        {loc}
      </option>
    ))}
  </select>
</div>

        {loading ? (
          <p className="text-center text-gray-500">Loading gardens...</p>
        ) : gardens.length === 0 ? (
          <p className="text-center text-gray-500">No gardens found yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            {gardens
  .filter((garden) => {
    if (filter !== "All") {
      const isBlitz = garden.type === "Blitz";
      const isHost = garden.description?.includes("Host");
      const isVolunteer = garden.description?.includes("Volunteer");

      switch (filter) {
        case "Blitz Host":
          if (!(isBlitz && isHost)) return false;
          break;
        case "Blitz Volunteer":
          if (!(isBlitz && isVolunteer)) return false;
          break;
        case "Long-Term Host":
          if (!(isBlitz === false && isHost)) return false;
          break;
        case "Long-Term Volunteer":
          if (!(isBlitz === false && isVolunteer)) return false;
          break;
        default:
          break;
      }
    }

    if (locationFilter !== "All" && garden.location !== locationFilter) {
      return false;
    }

    return true;
  })
  .map((garden) => (
              <div
                key={garden.id}
                className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl shadow space-y-2"
              >
                <h2 className="text-xl font-semibold">
                  {garden.host_name} — {garden.type}
                </h2>
                <p className="italic text-sm text-gray-600 dark:text-gray-300">
  {garden.description}
</p>
                <p>
                  <strong>Location:</strong> {garden.location}
                </p>
                <p>
                  <strong>Status:</strong> {garden.status}
                </p>
                <p>
                  <strong>Notes:</strong> {garden.notes}
                </p>
                <Link to={`/gardendetails/${garden.id}`}>
                  <button className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition">
                    View Details
                  </button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GardenDirectory;