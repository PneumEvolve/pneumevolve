// src/pages/WeDream.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
 
export default function WeDream() {
  const { accessToken } = useAuth();
  const isAuthed = !!accessToken;
 
  const [vision, setVision] = useState("");
  const [mantra, setMantra] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
 
  const saveTimerRef = useRef(null);
  const lastSavedRef = useRef({ vision: "", mantra: "" });
 
  // Load active entry on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isAuthed) return;
      try {
        const res = await api.get("/we-dream/active", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = res.data || {};
        if (!alive) return;
        if (data.exists) {
          setVision(data.vision || "");
          setMantra(data.mantra || "");
          lastSavedRef.current = { vision: data.vision || "", mantra: data.mantra || "" };
        }
      } catch (err) {
        console.error("Error fetching active dream entry:", err);
      }
    })();
    return () => { alive = false; };
  }, [isAuthed, accessToken]);
 
  async function saveDream() {
    if (!isAuthed) { setSaveStatus("Please sign in to save your dream."); return; }
    if (vision === lastSavedRef.current.vision && mantra === lastSavedRef.current.mantra) return;
    try {
      setSaveStatus("Saving…");
      const res = await api.post(
        "/we-dream/save",
        { vision, mantra },
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` } }
      );
      setSaveStatus(res.data?.message || "Saved!");
      lastSavedRef.current = { vision, mantra };
    } catch (err) {
      console.error("Error saving dream:", err);
      setSaveStatus("Failed to save.");
    }
  }
 
  async function clearDream() {
    if (!isAuthed) { setSaveStatus("Please sign in to clear your dream."); return; }
    if (!window.confirm("Clear your current dream?")) return;
    try {
      const res = await api.post(
        "/we-dream/clear",
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setVision("");
      setMantra("");
      lastSavedRef.current = { vision: "", mantra: "" };
      setSaveStatus(res.data?.message || "Cleared.");
    } catch (err) {
      console.error("Error clearing dream:", err);
      setSaveStatus("Failed to clear.");
    }
  }
 
  // Autosave debounced
  useEffect(() => {
    if (!isAuthed || (!vision && !mantra)) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveDream, 900);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [vision, mantra, isAuthed]); // eslint-disable-line react-hooks/exhaustive-deps
 
  return (
    <main className="main p-6 space-y-8">
      <section className="card text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold">🌙 We Dream</h1>
        <p className="opacity-90 max-w-lg mx-auto">
          What kind of world do you want to live in? Write your vision.
          Each night it becomes part of the collective dream.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Link to="/" className="btn btn-secondary">← Home</Link>
          <Link to="/experiments/dream-machine" className="btn btn-secondary">🔮 View Dream Machine</Link>
        </div>
      </section>
 
      {/* Vision */}
      <section className="space-y-2">
        <div className="section-bar">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold">Your vision</h2>
            <div className="text-xs opacity-70">
              {vision.length} {vision.length === 1 ? "character" : "characters"}
            </div>
          </div>
        </div>
        <div className="card space-y-3">
          <Textarea
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder="Describe the world you want to help build…"
            rows={8}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm opacity-50">
              {isAuthed ? "Autosaving…" : "Sign in to save"}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={saveDream} disabled={!isAuthed}>
                💾 Save
              </Button>
              <Button variant="secondary" onClick={clearDream} disabled={!isAuthed}>
                🧹 Clear
              </Button>
            </div>
          </div>
        </div>
      </section>
 
      {saveStatus && (
        <div className="text-center text-sm opacity-70">{saveStatus}</div>
      )}
    </main>
  );
}