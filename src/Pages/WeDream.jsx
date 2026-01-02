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
  const [loadingGen, setLoadingGen] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); // "", "Saving…", "Saved!", "Failed…"

  // debounce for autosave
  const saveTimerRef = useRef(null);
  const lastSavedRef = useRef({ vision: "", mantra: "" });

  // Load active entry for the authed user
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
    return () => {
      alive = false;
    };
  }, [isAuthed, accessToken]);

  async function generateMantra() {
    if (!vision.trim()) return;
    setLoadingGen(true);
    setSaveStatus("");
    try {
      const res = await api.post(
        "/we-dream/manifest",
        { text: vision },
        { headers: { "Content-Type": "application/json" } }
      );
      const m = (res.data && res.data.mantra) || "";
      setMantra(m);
    } catch (err) {
      console.error("Error generating mantra:", err);
      setMantra("Something went wrong. Try again.");
    } finally {
      setLoadingGen(false);
    }
  }

  async function saveDream() {
    if (!isAuthed) {
      setSaveStatus("Please sign in to save your dream.");
      return;
    }
    // Avoid redundant saves
    if (
      vision === lastSavedRef.current.vision &&
      mantra === lastSavedRef.current.mantra
    ) {
      return;
    }
    try {
      setSaveStatus("Saving…");
      const res = await api.post(
        "/we-dream/save",
        { vision, mantra },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setSaveStatus(res.data?.message || "Saved!");
      lastSavedRef.current = { vision, mantra };
    } catch (err) {
      console.error("Error saving dream:", err);
      setSaveStatus("Failed to save dream.");
    }
  }

  async function clearDream() {
    if (!isAuthed) {
      setSaveStatus("Please sign in to clear your dream.");
      return;
    }
    if (!window.confirm("Clear your current dream and mantra?")) return;
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

  // Autosave (debounced)
  useEffect(() => {
    if (!isAuthed) return;
    if (!vision && !mantra) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDream();
    }, 900);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vision, mantra, isAuthed]);

  return (
    <main className="main p-6 space-y-8">
      {/* Intro / CTA */}
      <section className="card text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold">🌙 We Dream</h1>
        <p className="opacity-90">
          What kind of world do you want to live in? Shape your vision and derive a mantra.
          Each night the Dream Machine blends one entry per user into a collective message.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Link to="/" className="btn btn-secondary">← Return Home</Link>
          <Link to="/experiments/dream-machine" className="btn btn-secondary">🔮 View Dream Machine</Link>
          <Link to="/journal" className="btn">✍️ Open Journal</Link>
        </div>
      </section>

      {/* Vision */}
      <section className="space-y-2">
        <div className="section-bar">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold">Your Vision</h2>
            <div className="text-xs opacity-70">
              {vision.length} {vision.length === 1 ? "character" : "characters"}
            </div>
          </div>
        </div>
        <div className="card space-y-3">
          <Textarea
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder="Describe your vision for the world we’re building…"
            rows={8}
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button onClick={generateMantra} disabled={loadingGen || !vision.trim()}>
              {loadingGen ? "Generating…" : "Manifest Mantra"}
            </Button>
            <Button variant="outline" onClick={saveDream} disabled={!isAuthed}>
              💾 Save
            </Button>
          </div>
        </div>
      </section>

      {/* Mantra */}
      <section className="space-y-2">
        <div className="section-bar">
          <h2 className="font-semibold">Your Mantra</h2>
        </div>
        <div className="card text-center">
          {mantra ? (
            <p className="text-xl leading-relaxed">✨ {mantra}</p>
          ) : (
            <p className="opacity-70">No mantra yet. Write your vision, then “Manifest Mantra”.</p>
          )}
        </div>
      </section>

      {/* Actions / Status */}
      <section className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm opacity-80">
          {isAuthed ? (
            <span className="badge">Signed in — autosave is on</span>
          ) : (
            <span className="badge">Not signed in — changes won't be saved</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={clearDream} disabled={!isAuthed}>
            🧹 Clear My Dream
          </Button>
        </div>
      </section>

      {saveStatus && (
        <div className="text-center text-sm opacity-80">
          {saveStatus}
        </div>
      )}
    </main>
  );
}