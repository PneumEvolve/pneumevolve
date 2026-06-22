// src/Pages/Slalom/SlalomLeaderboard.jsx
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Row({ rank, entry, mode }) {
  const name = mode === "coop"
    ? `${entry.player1_name} & ${entry.player2_name}`
    : entry.player1_name;
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: rank <= 3 ? "rgba(255,200,50,0.05)" : "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="w-7 text-sm font-mono text-center flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
        {medal || `#${rank}`}
      </div>
      <div className="flex-1 text-sm truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
        {name}
      </div>
      <div className="text-xs font-mono flex-shrink-0" style={{ color: "rgba(100,180,255,0.8)" }}>
        🚩 {entry.gates_passed}
      </div>
      <div className="text-xs font-mono flex-shrink-0" style={{ color: "rgba(68,238,255,0.8)" }}>
        💎 {entry.gems}
      </div>
      <div className="w-12 text-right text-xs flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>
        {formatDate(entry.created_at)}
      </div>
    </div>
  );
}

export default function SlalomLeaderboard({ onBack }) {
  const [tab, setTab]       = useState("solo"); // "solo" | "coop"
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get("/slalom/leaderboard", { params: { mode: tab, limit: 20 } })
      .then(({ data }) => { if (!cancelled) setEntries(data.entries || []); })
      .catch(() => { if (!cancelled) setError("Couldn't load the leaderboard."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab]);

  return (
    <main className="min-h-screen bg-[#060610] text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-light tracking-widest" style={{ color: "rgba(255,200,50,0.9)" }}>
            leaderboard
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
            ranked by gates · gems break ties
          </p>
        </div>

        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {["solo", "coop"].map((m) => (
            <button
              key={m}
              onClick={() => setTab(m)}
              className="flex-1 py-2.5 text-xs font-medium tracking-wide transition-all"
              style={{
                background: tab === m ? "rgba(100,180,255,0.1)" : "transparent",
                color: tab === m ? "rgba(100,180,255,0.9)" : "rgba(255,255,255,0.3)",
              }}
            >
              {m === "solo" ? "Solo" : "Co-op"}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {loading && (
            <p className="text-center text-xs py-8" style={{ color: "rgba(255,255,255,0.25)" }}>
              loading…
            </p>
          )}
          {error && (
            <p className="text-center text-xs py-8" style={{ color: "rgba(255,100,100,0.8)" }}>
              {error}
            </p>
          )}
          {!loading && !error && entries.length === 0 && (
            <p className="text-center text-xs py-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.25)" }}>
              No runs yet — be the first on the board.
            </p>
          )}
          {!loading && !error && entries.map((entry, i) => (
            <Row key={entry.id} rank={i + 1} entry={entry} mode={tab} />
          ))}
        </div>

        <button
          onClick={onBack}
          className="block w-full text-center text-xs py-2"
          style={{ color: "rgba(255,255,255,0.15)" }}
        >
          ← back to lobby
        </button>
      </div>
    </main>
  );
}