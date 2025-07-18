import React from "react";
import { Link } from "react-router-dom";

export default function WelcomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-left">
      <h1 className="text-4xl font-bold mb-6 text-center">🌱 Welcome to PneumEvolve</h1>

      <p className="mb-6 text-lg text-center">
        PneumEvolve is a spiritual and practical movement for rebuilding life around <strong>love, sovereignty, and cooperation</strong>. We are reimagining community, education, and care—one tool, one seed, one breath at a time.
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

      <h2 className="text-2xl font-semibold mb-4">🌿 What We're Growing</h2>
      <p className="mb-6">
        We believe a better world begins with meeting our shared needs—food, shelter, belonging, purpose—through care rather than control. PneumEvolve began as an experiment in community and has become a living movement for collaborative regeneration.
      </p>

      <ul className="list-disc list-inside mb-6 space-y-2">
        <li>🌱 <strong>Living Education</strong> — learning through life, land, and love</li>
        <li>🫂 <strong>Relational Healing</strong> — replacing isolation with interconnection</li>
        <li>📅 <strong>Event Tools</strong> — organizing local gatherings with ease</li>
        <li>🪴 <strong>Garden Blitzes</strong> — spontaneous acts of Earth regeneration</li>
        <li>🔁 <strong>Mutual Aid</strong> — give what you can, receive what you need</li>
        <li>🗳️ <strong>Community Voting</strong> — decentralized decision-making</li>
        <li>🪙 <strong>SEED Tokens (optional)</strong> — experimental economy of contribution</li>
      </ul>

      <p className="mb-6 italic text-sm">
        Many tools are still forming, but the heart is already alive. If you're here, you're already part of it.
      </p>

      <hr className="my-10 border-gray-300" />

      <h2 className="text-2xl font-semibold mb-4">🕯 Our Philosophy</h2>
      <ul className="list-disc list-inside mb-6 space-y-2">
        <li>💖 Love is the most powerful force in the universe.</li>
        <li>🧠 Education should be joyful, curiosity-led, and life-rooted.</li>
        <li>🌍 Better systems are not just possible—they're emerging now.</li>
        <li>👣 We don’t need to remember past lives to live this one fully.</li>
        <li>✨ Every person has value simply because they exist.</li>
        <li>🧭 Leadership is shared. Everyone brings a piece of the path forward.</li>
        <li>🤝 We are not meant to do this alone.</li>
      </ul>

      <p className="text-center font-semibold mt-10">
        PneumEvolve is not a product. It’s a pulse. A remembering. A return.  
        <br />
        Let’s grow something sacred—together.
      </p>
    </div>
  );
}