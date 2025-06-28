// GardenDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import supabase from "../utils/supabase";

const GardenDetails = () => {
  const { id } = useParams();
  const [garden, setGarden] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGarden = async () => {
      const { data, error } = await supabase
        .from("gardens")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching garden:", error);
      } else {
        setGarden(data);
      }
      setLoading(false);
    };

    fetchGarden();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 text-center text-gray-600 dark:text-gray-300">
        Loading garden...
      </div>
    );
  }

  if (!garden) {
    return (
      <div className="min-h-screen p-6 text-center text-red-600 dark:text-red-400">
        Garden not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold">🌿 Garden Details</h1>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl shadow space-y-2">
          <p><strong>Host:</strong> {garden.host_name}</p>
          <p><strong>Type:</strong> {garden.type}</p>
          <p><strong>Location:</strong> {garden.location}</p>
          <p><strong>Status:</strong> {garden.status}</p>
          <p><strong>Notes:</strong> {garden.notes || "None"}</p>
        </div>

        <Link
          to="/gardens"
          className="inline-block mt-4 bg-blue-500 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-600 transition"
        >
          ← Back to Directory
        </Link>
      </div>
    </div>
  );
};

export default GardenDetails;