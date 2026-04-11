import React from "react";
import { Link } from "react-router-dom";

const WeGreenLanding = () => {
  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-4xl mx-auto px-6 py-12">

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">🌱 We Green</h1>
          <p className="text-base max-w-2xl mx-auto" style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            Empower your neighborhood with gardens that grow more than food — they grow
            community, purpose, and peace. We Green is your portal to launching or joining
            local gardens.
          </p>
        </div>

        <div className="card mb-6 p-6">
          <h2 className="text-xl font-semibold mb-3">🍅 SEED Token System</h2>
          <p className="text-sm mb-4" style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            SEED is our local currency backed by garden produce. Volunteers and hosts earn
            SEED by growing and sharing fruits and vegetables. Use SEED to trade with neighbors,
            buy fresh food, or support other gardens — no cash needed.
          </p>
          <ul className="text-sm space-y-2" style={{ color: "var(--muted)" }}>
            <li>🌻 Earn SEED by volunteering or donating to gardens</li>
            <li>🥕 Spend SEED at local produce stands or trade with others</li>
            <li>🌾 Hosts earn a share of the SEED produced from their gardens</li>
            <li>🍋 Creates a self-sustaining, cashless economy for food</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-10">
          <Link to="/garden-blitz" className="btn">
            Start a Garden Blitz 🌿
          </Link>
          <Link to="/garden-directory" className="btn btn-secondary">
            Explore Gardens Nearby 🌍
          </Link>
        </div>

        <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
          Built by your community. Powered by purpose.
        </p>
      </div>
    </main>
  );
};

export default WeGreenLanding;