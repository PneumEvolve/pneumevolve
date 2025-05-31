import React, { useEffect, useState } from "react";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { fetchWithAuth } from "../utils/fetchWithAuth";

let saveTimeout;

const WeDream = () => {
  const [vision, setVision] = useState("");
  const [mantra, setMantra] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchActiveEntry = async () => {
      if (!token) return;

      try {
        const res = await fetch("https://shea-klipper-backend.onrender.com/we-dream/active", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (data.exists) {
          setVision(data.vision);
          setMantra(data.mantra);
        }
      } catch (err) {
        console.error("Error fetching active dream entry:", err);
      }
    };

    fetchActiveEntry();
  }, [token]);

  const handleGenerate = async () => {
    setLoading(true);
    setSaveStatus("");
    try {
      const res = await fetch("https://shea-klipper-backend.onrender.com/we-dream/manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: vision }),
      });
      const data = await res.json();
      setMantra(data.mantra);
    } catch (err) {
      console.error("Error generating mantra:", err);
      setMantra("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token) {
      setSaveStatus("Please sign in to save your dream.");
      return;
    }

    try {
      const res = await fetchWithAuth("https://shea-klipper-backend.onrender.com/we-dream/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ vision, mantra }),
      });
      const data = await res.json();
      setSaveStatus(data.message || "Saved!");
    } catch (err) {
      console.error("Error saving dream:", err);
      setSaveStatus("Failed to save dream.");
    }
  };

  const handleClear = async () => {
    try {
      const res = await fetch("https://shea-klipper-backend.onrender.com/we-dream/clear", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
      });
      const data = await res.json();
      setVision("");
      setMantra("");
      setSaveStatus(data.message);
    } catch (err) {
      console.error("Error clearing dream:", err);
      setSaveStatus("Failed to clear.");
    }
  };

  useEffect(() => {
    if (!token || !vision || !mantra) return;

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      handleSave();
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [vision, mantra]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">We Dream</h1>
      <p className="text-center text-gray-600">
        What kind of world do you want to live in?
      </p>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Every night, the Dream Machine gathers one vision from each user and blends them into a collective AI summary and mantra. 
        Your current dream will be the one that gets used, so shape it with care. You can update it anytime.
      </p>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-4 text-center">
        <Link
          to="/"
          className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 transition"
        >
          🏠 Return to PneumEvolve
        </Link>

        <Link
          to="/dreammachine"
          className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 transition"
        >
          🔮 View Latest Dream Machine Summary
        </Link>
      </div>

      <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2">
        ✍️ If you just want to write, we also provide a {" "}
        <Link
          to="/smartjournal"
          className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 transition"
        >
          Smart Journal
        </Link>{" "}
        with built-in mantra reflection.
      </p>

      <Textarea
        value={vision}
        onChange={(e) => setVision(e.target.value)}
        placeholder="Write your vision for the world here..."
        rows={6}
      />

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Manifest Mantra"}
        </Button>
        <Button onClick={handleSave} variant="outline">
          💾 Save Dream
        </Button>
      </div>

      {mantra && (
        <div className="mt-6 bg-gray-100 p-4 rounded-xl text-center text-xl font-semibold">
          ✨ {mantra}
        </div>
      )}

      <div className="flex justify-center gap-4 mt-4">
        <Button variant="secondary" onClick={handleClear}>
          🧹 Clear My Dream
        </Button>
      </div>

      {saveStatus && (
        <p className="text-center mt-2 text-sm text-green-600 dark:text-green-400">
          {saveStatus}
        </p>
      )}
    </div>
  );
};

export default WeDream;