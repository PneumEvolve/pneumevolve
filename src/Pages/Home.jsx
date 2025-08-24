// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

export default function HomePageSimple() {
  const [newest, setNewest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get("/forge/items", { params: { sort: "new", limit: 3 } });
        const rows = Array.isArray(res.data) ? res.data : [];
        const items = rows.map((r) => ({
          type: r.kind, // "idea" | "problem"
          id: r.id,
          title: r.title || "(untitled)",
          href:
            r.kind === "problem" && r.problem_ref?.id
              ? `/forge2/problems/${r.problem_ref.id}`
              : `/forge2/${r.id}`,
        }));
        if (alive) setNewest(items);
      } catch (e) {
        console.error("Failed to load newest Forge items:", e);
        if (alive) setLoadErr("Can't load the Forge right now.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-12 text-center">
      <section>
        <img src="/logo.png" alt="PneumEvolve Logo" className="w-20 h-20 mx-auto mb-4 rounded-full" />
        <h1 className="text-4xl font-bold">PneumEvolve</h1>
        <p className="mt-4 text-lg">
          Tired of shouting into the void? <span className="font-semibold">Enter the Forge</span> — a place to post problems and ideas, vote on what matters, and turn momentum into action.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <Link to="/forge2" className="btn">Browse and Vote in the Forge</Link>
          <Link to="/sitemap" className="btn btn-secondary">Everything else</Link>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4">What’s Happening Now</h3>
        {loading && <p className="text-sm opacity-70">Loading…</p>}
        {!loading && loadErr && <p className="text-sm opacity-70">{loadErr}</p>}
        {!loading && !loadErr && newest.length === 0 && (
          <p className="text-sm opacity-70">No activity yet — be the first to post!</p>
        )}
        <ul className="space-y-2">
          {newest.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <Link to={item.href} className="underline hover:no-underline">
                {item.title}
              </Link>
              <span className="ml-2 text-xs opacity-60">({item.type})</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}