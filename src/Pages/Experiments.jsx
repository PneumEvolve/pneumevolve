// src/pages/Experiments.jsx
import React from "react";
import { Link } from "react-router-dom";

const rows = [
  { to: "/living-plan", icon: "🛠️", title: "Living Plan", blurb: "A plan manager (AI not functional)." },
  { to: "/text-game", icon: "🛠️", title: "Text Game", blurb: "A simple Dreamfire-based text game." },
  { to: "/tarot", icon: "🃏", title: "Tarot Reading", blurb: "Pull cards, peer into the current." },
  { to: "/we-choose", icon: "🗳️", title: "We Choose", blurb: "Prototype: transparent, collective decision-making." },
  { to: "/we-learn", icon: "📖", title: "We Learn", blurb: "Let AI explain laws, policies, and systems." },
  { to: "/we-plan", icon: "🧠", title: "We Plan", blurb: "Synthesis engine: ideas → action." },
  { to: "/we-help", icon: "🤝", title: "We Help", blurb: "Ask for or offer help — local or global." },
  { to: "/we-do", icon: "🛠️", title: "We Do", blurb: "Marketplace of action. Build together." },
];

export default function Experiments() {
  return (
    <div className="main p-6 space-y-6">
      {/* Top bar matches app’s section style */}
      <header className="section-bar">
        <h1 className="m-0">🧪 Shea’s Living Lab</h1>
      </header>

      {/* Intro copy lives on a card to match the app */}
      <section className="card">
        <p className="text-base leading-relaxed">
          Welcome to the back room of PneumEvolve — a place for prototypes, strange
          visions, and things not quite ready for the spotlight. Some tools are functional,
          others are fragments waiting for their next mutation. Nothing here is final.
          Everything is invitation.
        </p>
      </section>

      {/* Grid of “card links” (no hard-coded colors; respects theme) */}
      <section className="grid sm:grid-cols-2 gap-3">
        {rows.map((r) => (
          <Link
            key={r.to}
            to={r.to}
            className="card group flex items-start gap-3 transition"
          >
            <div className="text-2xl leading-none">{r.icon}</div>
            <div className="flex-1">
              <div className="font-semibold group-hover:underline">{r.title}</div>
              <div className="opacity-80 text-sm mt-0.5">{r.blurb}</div>
            </div>
            <div aria-hidden className="opacity-40 group-hover:opacity-70 transition">→</div>
          </Link>
        ))}
      </section>

      <footer className="text-sm opacity-70 italic">
        Experiments are sacred chaos. If something speaks to you, build it. If something’s broken,
        break it better.
      </footer>
    </div>
  );
}