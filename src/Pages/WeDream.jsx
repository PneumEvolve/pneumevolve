import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";

const API = import.meta.env.VITE_API_URL;

let saveTimeout;

const WeDream = () => {
  const [vision, setVision] = useState("");
  const [mantra, setMantra] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const { accessToken } = useAuth();

  useEffect(() => {
    const fetchActiveEntry = async () => {
      if (!accessToken) return;

      try {
        const res = await axios.get(`${API}/we-dream/active`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const data = res.data;
        if (data.exists) {
          setVision(data.vision);
          setMantra(data.mantra);
        }
      } catch (err) {
        console.error("Error fetching active dream entry:", err);
      }
    };

    fetchActiveEntry();
  }, [accessToken]);

  const handleGenerate = async () => {
    setLoading(true);
    setSaveStatus("");
    try {
      const res = await axios.post(
        `${API}/we-dream/manifest`,
        { text: vision },
        { headers: { "Content-Type": "application/json" } }
      );
      setMantra(res.data.mantra);
    } catch (err) {
      console.error("Error generating mantra:", err);
      setMantra("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!accessToken) {
      setSaveStatus("Please sign in to save your dream.");
      return;
    }

    try {
      const res = await axios.post(
        `${API}/we-dream/save`,
        { vision, mantra },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setSaveStatus(res.data.message || "Saved!");
    } catch (err) {
      console.error("Error saving dream:", err);
      setSaveStatus("Failed to save dream.");
    }
  };

  const handleClear = async () => {
    try {
      const res = await axios.post(
        `${API}/we-dream/clear`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setVision("");
      setMantra("");
      setSaveStatus(res.data.message);
    } catch (err) {
      console.error("Error clearing dream:", err);
      setSaveStatus("Failed to clear.");
    }
  };

  useEffect(() => {
    if (!accessToken || !vision || !mantra) return;

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
        <a
          href="/"
          className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 transition"
        >
          🏠 Return to PneumEvolve
        </a>

        <a
          href="/dreammachine"
          className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 transition"
        >
          🔮 View Latest Dream Machine Summary
        </a>
      </div>

      <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2">
        ✍️ If you just want to write, we also provide a {" "}
        <a
          href="/smartjournal"
          className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 transition"
        >
          Smart Journal
        </a>{" "}
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