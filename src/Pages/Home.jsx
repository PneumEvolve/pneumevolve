// src/pages/HomePageSimple.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api"


export default function HomePageSimple() {
  const { isLoggedIn } = useAuth();
  const [newest, setNewest] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [ideasRes, probsRes] = await Promise.all([
          api.get(`/forge/ideas`, { params: { limit: 3 } }),
          api.get(`/problems`, { params: { sort: "new", limit: 3 } }),
        ]);
        const ideas = ideasRes.data.map((i) => ({
          type: "idea", id: i.id, title: i.title, href: `/forge/${i.id}`
        }));
        const probs = probsRes.data.map((p) => ({
          type: "problem", id: p.id, title: p.title, href: `/problems/${p.id}`
        }));
        setNewest([...ideas, ...probs].slice(0, 3));
      } catch (e) {
        console.error("Failed to load newest content:", e);
      }
    })();
  }, []);

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-12 text-center">
      {/* Hero */}
      <section>
        <img src="/logo.png" alt="PneumEvolve Logo" className="w-20 h-20 mx-auto mb-4 rounded-full" />
        <h1 className="text-4xl font-bold">PneumEvolve</h1>
        <p className="mt-4 text-lg">
          Angry at the state of the world, at peace with it, or somewhere in between? 
          <span className="font-semibold"> Enter PneumEvolve</span> — a living space where frustration becomes creation,
          grief becomes connection, and possibility becomes action.
        </p>
      </section>

      {/* Two Doors */}
      <section className="grid gap-6 sm:grid-cols-2">
        <Link to="/forge" className="card p-6 hover:shadow-lg transition">
          <h2 className="text-2xl font-bold">Join the Conversation</h2>
          <p className="mt-2 text-sm opacity-80">Propose ideas, vote, and help decide what we build next.</p>
        </Link>
        <Link to={isLoggedIn ? "/journal" : "/signup"} className="card p-6 hover:shadow-lg transition">
          <h2 className="text-2xl font-bold">Start Your Journey</h2>
          <p className="mt-2 text-sm opacity-80">Reflect, dream, and track your growth in your personal journal.</p>
        </Link>
      </section>

      {/* Community Pulse */}
      <section>
        <h3 className="text-lg font-semibold mb-4">What’s Happening Now</h3>
        {newest.length === 0 && <p className="text-sm opacity-70">No activity yet — be the first to post!</p>}
        <ul className="space-y-2">
          {newest.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <Link to={item.href} className="underline hover:no-underline">{item.title}</Link>
              <span className="ml-2 text-xs opacity-60">({item.type})</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}