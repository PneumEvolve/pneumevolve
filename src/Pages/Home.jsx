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
              ? `/forge/problems/${r.problem_ref.id}`
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

  const TypeBadge = ({ t }) => (
    <span className="badge">
      {String(t || "").toUpperCase()}
    </span>
  );

  return (
    <main className="main p-6 space-y-8">
      {/* Hero */}
      <section className="card text-center space-y-4">
        <img
          src="/logo.png"
          alt="PneumEvolve logo"
          className="w-16 h-16 mx-auto rounded-full"
        />
        <h1 className="text-3xl sm:text-4xl font-bold">PneumEvolve</h1>
        <p className="text-base sm:text-lg opacity-90">
          Tired of shouting into the void? <span className="font-semibold">Enter the Forge</span> — post
          problems & ideas, vote on what matters, and turn momentum into action. Work In Progress.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
          <Link to="/forge2" className="btn">Browse & Vote in the Forge</Link>
          {/* FIXED: “Everything else” → Site Map */}
          <Link to="/sitemap" className="btn btn-secondary">Explore Site Map</Link>
        </div>
      </section>

      {/* Activity */}
      <section className="space-y-3">
        <div className="section-bar">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">What’s happening now</h3>
            <Link to="/forge2" className="link-default text-sm">See all →</Link>
          </div>
        </div>

        <div className="space-y-2">
          {loading && <div className="opacity-70 text-sm">Loading…</div>}
          {!loading && loadErr && <div className="opacity-70 text-sm">{loadErr}</div>}
          {!loading && !loadErr && newest.length === 0 && (
            <div className="opacity-70 text-sm">No activity yet — be the first to post!</div>
          )}

          {newest.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              to={item.href}
              className="card flex items-start justify-between gap-4 hover:no-underline"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <TypeBadge t={item.type} />
                </div>
                <div className="font-semibold">{item.title}</div>
              </div>
              <div className="opacity-60 text-sm">Open →</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}