// src/pages/WeirdDreamMachine.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const WeirdDreamMachine = () => {
  const [dream, setDream] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (dream.trim().length < 10) return alert("Tell us just a little more...");
    // For now, just simulate a submission
    setSubmitted(true);
    setDream("");
    // 🔮 Eventually POST to backend here
  };

  return (
    <div className="max-w-3xl mx-auto p-6 text-center dark:text-white">
      <h1 className="text-4xl font-bold mb-4">🌌 The Weird Dream Machine</h1>
      <p className="mb-6 text-lg italic text-gray-600 dark:text-gray-300">
        Submit your dream. Once every 24 hours, the machine awakens and speaks in symbols. (Under Development)
      </p>

      {submitted ? (
        <div className="p-4 bg-green-100 dark:bg-green-900 rounded shadow mb-6">
          🌠 Dream received. You may return at midnight...
        </div>
      ) : (
        <>
          <textarea
            className="w-full p-3 border rounded mb-4 h-40 dark:bg-gray-800 dark:text-white"
            placeholder="Last night I saw..."
            value={dream}
            onChange={(e) => setDream(e.target.value)}
          />
          <Button onClick={handleSubmit}>
            Submit Dream
          </Button>
        </>
      )}

      <hr className="my-8" />

      <h2 className="text-2xl font-semibold mb-2">🧠 Collective Dream</h2>
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded shadow">
        <p className="italic text-gray-700 dark:text-gray-300">
          "We dreamed of spirals. Of wings made of whispering fog. Of a voice humming through the stones."
        </p>
        <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">
          Last updated: 2:00 AM UTC
        </p>
      </div>

      <div className="mt-6">
        <Button onClick={() => navigate("/experiments")} className="mt-4">
          ← Back to Experiments
        </Button>
      </div>
    </div>
  );
};

export default WeirdDreamMachine;