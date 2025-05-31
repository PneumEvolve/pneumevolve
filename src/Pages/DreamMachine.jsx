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

  const shareOnFacebook = () => {
    const url = encodeURIComponent("https://pneumevolve.com/dreammachine");
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 text-gray-900 dark:text-gray-100">
      <h1 className="text-4xl dark:text-black font-bold text-center">🌍 Dream Machine</h1>
      <p className="text-center text-gray-700 dark:text-black">
        Each night, the Dream Machine gathers one dream from every active user—visions of a better world. It blends them into a single collective summary and distills a powerful mantra from the shared intention. This evolving message reflects the heart of our community: a glimpse into the future we’re choosing to build—together.
      </p>

      {/* Navigation Links */}
      <div className="flex justify-center gap-6 mt-4">
        <Link
          to="/"
          className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 transition"
        >
          🏠 Return to PneumEvolve
        </Link>
        <Link
          to="/wedream"
          className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 transition"
        >
          ➕ Add your Dream to the Machine
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400">Loading collective dream...</p>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold mb-2 text-center text-gray-900 dark:text-gray-100">
              ✨ Collective Mantra
            </h2>
            <p className="text-xl text-center text-blue-600 dark:text-blue-400">{mantra}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border border-gray-200 dark:border-gray-700 mt-4">
            <h2 className="text-2xl font-semibold mb-2 text-center text-gray-900 dark:text-gray-100">
              🧠 AI Summary
            </h2>
            <p className="text-center text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {summary}
            </p>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
              {count} dream{count !== 1 ? "s" : ""} contributed • Last updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "unknown"}
            </p>
            <div className="flex justify-center mt-4">
              <button
                onClick={shareOnFacebook}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Share this on Facebook
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DreamMachine;
