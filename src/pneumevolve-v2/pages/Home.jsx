import React from "react";
import { useNavigate } from "react-router-dom";

export default function HomeV2() {
  const navigate = useNavigate();

  const pillars = [
    {
      title: "🧘 I AM",
      description: "Explore who you are. Discover your beliefs. Reflect without judgment.",
      route: "/v2/i-am",
    },
    {
      title: "🤝 WE SHAPE",
      description: "Join others in identifying and solving real problems in the world.",
      route: "/v2/we-shape",
    },
    {
      title: "🌿 WE GROW",
      description: "Watch hope grow. Earn SEED. Help evolve our shared reality.",
      route: "/v2/we-grow",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 p-6 space-y-6">
      <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 dark:text-gray-100">
        PneumEvolve 2.0
      </h1>
      <p className="text-center text-gray-600 dark:text-gray-300 max-w-xl">
        A space to inspire hope, take action, and explore who you really are.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl">
        {pillars.map((pillar) => (
          <button
            key={pillar.title}
            onClick={() => navigate(pillar.route)}
            className="bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded-xl p-4 shadow hover:scale-105 transition-all"
          >
            <h2 className="text-xl font-semibold mb-2">{pillar.title}</h2>
            <p className="text-sm">{pillar.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}