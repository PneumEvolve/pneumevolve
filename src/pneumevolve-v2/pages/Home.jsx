// src/pneumevolve-v2/pages/Home.jsx

import React from "react";
import { useNavigate } from "react-router-dom";

export default function HomeV2() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "🛠️ The Forge",
      description: "Vote on the next feature. Join a build team. Help shape PneumEvolve’s codebase together.",
      route: "/forge",
    },
    {
      title: "🎨 Artists Enclave",
      description: "Vote on background images and future design directions. Add soul to the system.",
      route: "/artistsenclave",
    },
    {
      title: "📣 Problem Page",
      description: "Post any problem — global, local, or personal. Together we name what needs fixing.",
      route: "/problems",
    },
    {
      title: "🧘 I AM",
      description: "Explore who you are. Discover your beliefs. Reflect without judgment.",
      route: "/v2/i-am",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 p-6 space-y-8">
      <h1 className="text-4xl font-bold text-center text-gray-800 dark:text-gray-100">
        🌍 PneumEvolve
      </h1>

      <p className="text-center text-gray-600 dark:text-gray-300 max-w-2xl text-lg">
        This site is not finished. It’s evolving — with you.
        <br />
        PneumEvolve is a digital space for dreaming, building, and co-creating a better future together.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 w-full max-w-5xl">
        {sections.map((section) => (
          <button
            key={section.title}
            onClick={() => navigate(section.route)}
            className="bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded-xl p-5 shadow hover:scale-105 transition-all"
          >
            <h2 className="text-2xl font-semibold mb-2">{section.title}</h2>
            <p className="text-md">{section.description}</p>
          </button>
        ))}
      </div>

      <p className="text-center text-sm text-gray-400 dark:text-gray-500 pt-4 max-w-lg">
        Don’t just use the site. Help build it. Choose a path above and shape PneumEvolve with us.
      </p>
    </div>
  );
}