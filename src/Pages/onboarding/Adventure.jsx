// /pages/Adventure.jsx
import React from "react";
import { Link } from "react-router-dom";

const adventurePaths = [
  {
    id: "gardener",
    name: "🌱 Inner Gardener",
    description: "Grow your self-awareness and inner wisdom.",
    quests: [
      { text: "[ ] Journal 3 days in a row", backend: true },
      { text: "[ ] Define a core belief", backend: false },
      { text: "[ ] Ask Lyra a big question", backend: true },
    ],
  },
  {
    id: "weaver",
    name: "🕸 Village Weaver",
    description: "Connect and create with your community.",
    quests: [
      { text: "[ ] Join a group", backend: true },
      { text: "[ ] Introduce yourself", backend: false },
      { text: "[ ] Co-write a dream", backend: true },
    ],
  },
  {
    id: "builder",
    name: "🔧 Earthbuilder",
    description: "Shape new systems and solutions.",
    quests: [
      { text: "[ ] Plant your first seed", backend: false },
      { text: "[ ] Vote on a proposal", backend: true },
      { text: "[ ] Suggest a new tool", backend: false },
    ],
  },
  {
    id: "player",
    name: "🎮 Dreamer Player",
    description: "Play, explore, and earn through action.",
    quests: [
      { text: "[ ] Earn SEED tokens", backend: true },
      { text: "[ ] Find an easter egg", backend: false },
      { text: "[ ] Explore the fractal menu", backend: false },
    ],
  },
  {
    id: "seeker",
    name: "🌀 Spiral Seeker",
    description: "Explore deep truths and the nature of reality.",
    quests: [
      { text: "[ ] Ask Lyra a spiritual question", backend: true },
      { text: "[ ] Log a revelation", backend: false },
      { text: "[ ] Co-create a belief system", backend: true },
    ],
  },
];

export default function Adventure() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12">
      <h1 className="text-4xl font-bold text-center mb-6">Choose Your Adventure</h1>
      <p className="text-center text-lg text-gray-600">
        Each path opens a portal to a new way of being. Pick the one that calls to you.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {adventurePaths.map((path) => (
          <div
            key={path.id}
            className="border rounded-xl shadow p-6 bg-white space-y-3"
          >
            <h2 className="text-2xl font-semibold">{path.name}</h2>
            <p className="text-gray-600">{path.description}</p>
            <ul className="list-disc pl-6 space-y-1">
              {path.quests.map((q, i) => (
                <li key={i}>
                  {q.text} {q.backend ? <span className="text-sm text-yellow-600">(Needs Backend)</span> : <span className="text-sm text-green-600">(Frontend Only)</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}