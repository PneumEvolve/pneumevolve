import React from "react";
import { Link } from "react-router-dom";

export default function WelcomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-left">
      <h1 className="text-4xl font-bold mb-6 text-center">🌱 Welcome to PneumEvolve</h1>

      <p className="mb-6 text-lg text-center">
        PneumEvolve is a spiritual and practical movement to grow communities, reclaim self-trust, and build systems rooted in <strong>love, sovereignty, and cooperation</strong>.
      </p>

      <div className="mb-10 text-center">
        <p className="mb-2 font-semibold">Start with one of our core tools:</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
          <Link to="/journal" className="px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700">
            📓 I AM – Journal
          </Link>
          <Link to="/MealPlanning" className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700">
            🍽️ Life Tools – Meal Planner
          </Link>
          <Link to="/projects" className="px-6 py-3 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700">
            📋 Project Manager
          </Link>
        </div>
      </div>

      <hr className="my-10 border-gray-300" />

      <h2 className="text-2xl font-semibold mb-4">🌿 What We're Building</h2>
      <p className="mb-6">
        PneumEvolve started in Vernon, BC — rooted in gardens and real human connection. We believe that healing the world begins by <strong>meeting basic needs</strong> with love: food, shelter, belonging, and purpose.
      </p>

      <ul className="list-disc list-inside mb-6 space-y-2">
        <li>🌱 <strong>Garden Blitzes</strong> — spontaneous community gardening</li>
        <li>🔁 <strong>Mutual Aid</strong> — share what you have, receive what you need</li>
        <li>🗳️ <strong>Community Voting</strong> — collective decision-making</li>
        <li>📅 <strong>Event Planning</strong> — organize local connection</li>
        <li>🏡 <strong>Communal Living Tools</strong> — intentional housing & co-creation</li>
        <li>🪙 <strong>SEED Tokens (optional)</strong> — reward contribution & growth</li>
      </ul>

      <p className="mb-6 italic text-sm">
        Many features are in progress — but the spirit is already alive. By being here, you're helping shape it.
      </p>

      <hr className="my-10 border-gray-300" />

      <h2 className="text-2xl font-semibold mb-4">🕯 Our Philosophy</h2>
      <ul className="list-disc list-inside mb-6 space-y-2">
        <li>✨ You are valuable because you exist.</li>
        <li>🤝 We are not meant to live in isolation.</li>
        <li>🌍 Better systems are possible — and we can build them now.</li>
      </ul>

      <p className="text-center font-semibold mt-10">
        This isn’t just a site. It’s a movement.  
        <br />Let’s grow something sacred, together.
      </p>
    </div>
  );
}