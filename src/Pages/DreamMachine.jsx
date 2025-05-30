import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "https://shea-klipper-backend.onrender.com/we-dream";

const DreamMachine = () => {
  const [summary, setSummary] = useState("");
  const [mantra, setMantra] = useState("");
  const [count, setCount] = useState(0);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDreamData = async () => {
      try {
        const res = await fetch(`${API_URL}/collective`);
        const data = await res.json();
        setSummary(data.summary);
        setMantra(data.mantra);
        setCount(data.count);
        setUpdatedAt(data.updated_at || "");
      } catch (err) {
        console.error("Failed to load dream machine data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDreamData();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-4xl font-bold text-center">🌍 Dream Machine</h1>
      <p className="text-center text-gray-600">
        Each night, the Dream Machine gathers one dream from every active user—visions of a better world. It blends them into a single collective summary and distills a powerful mantra from the shared intention. This evolving message reflects the heart of our community: a glimpse into the future we’re choosing to build—together.
      </p>

      {/* Navigation Links */}
      <div className="flex justify-center gap-6 mt-4">
        <Link
          to="/wedream"
          className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 transition"
        >
          ➕ Add your Dream to the Machine
        </Link>
        <Link
          to="/"
          className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 transition"
        >
          🏠 Return to PneumEvolve
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading collective dream...</p>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow">
            <h2 className="text-2xl font-semibold mb-2 text-center">✨ Collective Mantra</h2>
            <p className="text-xl text-center text-blue-600 dark:text-blue-400">{mantra}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow mt-4">
            <h2 className="text-2xl font-semibold mb-2 text-center">🧠 AI Summary</h2>
            <p className="text-center text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {summary}
            </p>
            <p className="text-center text-sm text-gray-500 mt-2">
              {count} dream{count !== 1 ? "s" : ""} contributed • Last updated:{" "}
              {updatedAt ? new Date(updatedAt).toLocaleString() : "unknown"}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default DreamMachine;