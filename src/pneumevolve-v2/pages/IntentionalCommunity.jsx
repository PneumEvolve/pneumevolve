// IntentionalCommunity.jsx
// PneumEvolve 2.0 - Intentional Communities Master Plan

import React from "react";

export default function IntentionalCommunity() {
  const steps = [
    {
      title: "1. Learn",
      description:
        "Explore what intentional communities are and what already exists.",
      details: [
        "Articles, videos, and AI-guided intros",
        "Map of existing communities",
        "Explainers: commune vs co-housing vs eco-village vs spiritual collectives",
      ],
    },
    {
      title: "2. Reflect",
      description: "Discover what kind of community fits your soul.",
      details: [
        "Interactive quiz: values, lifestyle, needs, contributions",
        "Journal-style prompts or Lyra-powered belief exploration",
        "Output: personalized 'community archetype' profile",
      ],
    },
    {
      title: "3. Organize",
      description: "Meet others who share your vision and start forming groups.",
      details: [
        "Group matchmaking based on values",
        "Forums, chats, shared project boards",
        "Co-create a vision/charter together",
      ],
    },
    {
      title: "4. Co-Create",
      description:
        "Build charters, make decisions, and design your space together.",
      details: [
        "Shared decision making tools (e.g., We Vote)",
        "Group documents (charters, bylaws, agreements)",
        "Project planning: garden blitzing, land scouting, resource pooling",
        "Lyra as neutral guide/helper/memory keeper",
      ],
    },
    {
      title: "5. Live & Evolve",
      description:
        "Grow, adapt, and support each other in real-time as a living community.",
      details: [
        "Ongoing rituals, check-ins, community support tools",
        "Shared memory logs: challenges, breakthroughs, dreams",
        "Option to go public on a map for visibility, help, or funding",
      ],
    },
  ];

  return (
    <div className="min-h-screen p-8 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-center">
        🌿 PneumEvolve: The Intentional Community Journey
      </h1>
      <p className="text-center max-w-3xl mx-auto mb-10">
        A space to guide people from curiosity to co-creation — learning, connecting,
        and living within intentional communities.
      </p>
      <div className="space-y-8">
        {steps.map((step, i) => (
          <div
            key={i}
            className="border-l-4 border-green-500 pl-4 py-2 bg-green-50 dark:bg-green-800 rounded"
          >
            <h2 className="text-xl font-semibold">{step.title}</h2>
            <p className="mb-2 italic">{step.description}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              {step.details.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}