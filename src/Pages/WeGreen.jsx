// WeGreenLanding.jsx
import React from "react";
import { Link } from "react-router-dom";

const WeGreenLanding = () => {
  return (
    <div className="min-h-screen bg-green-50 dark:bg-gray-900 text-gray-900 dark:text-white py-12 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-extrabold mb-4">🌱 Welcome to We Green</h1>
        <p className="text-xl mb-6">
          Empower your neighborhood with gardens that grow more than food — they grow
          community, purpose, and peace. We Green is your portal to launching or joining
          local gardens and earning SEED tokens for your contributions.
        </p>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl mb-8">
          <h2 className="text-2xl font-semibold mb-4">🍅 SEED Token System</h2>
          <p className="mb-4">
            SEED is our local currency backed by garden produce. Volunteers and hosts earn
            SEED by growing and sharing fruits and vegetables. Use SEED to trade with neighbors,
            buy fresh food, or support other gardens — no cash needed.
          </p>
          <ul className="list-disc list-inside text-left max-w-xl mx-auto">
            <li>🌻 Earn SEED by volunteering or donating to gardens</li>
            <li>🥕 Spend SEED at local produce stands or trade with others</li>
            <li>🌾 Hosts earn a share of the SEED produced from their gardens</li>
            <li>🍋 Creates a self-sustaining, cashless economy for food</li>
          </ul>
        </div>

        <div className="space-x-4">
          <Link
            to="/gardenblitz"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg shadow hover:bg-green-700"
          >
            Start a Garden Blitz 🌿
          </Link>
          <Link
            to="/gardendirectory"
            className="inline-block bg-white text-green-600 dark:bg-gray-800 dark:text-green-400 px-6 py-3 rounded-lg border border-green-600 hover:shadow"
          >
            Explore Gardens Nearby 🌍
          </Link>
        </div>

        <p className="mt-10 text-sm text-gray-500 dark:text-gray-400">
          Built by your community. Powered by purpose.
        </p>
      </div>
    </div>
  );
};

export default WeGreenLanding;