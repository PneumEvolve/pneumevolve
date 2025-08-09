// /src/pneumevolve-v2/pages/IAm.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function IAm() {
  const navigate = useNavigate();

  const tools = [
    {
      title: "📝 Smart Journal",
      description: "Reflect, vent, or document your growth. A safe space for thoughts.",
      route: "/smartjournal",
    },
    {
      title: "🧠 Belief Explorer",
      description: "Coming soon — a tool to explore, map, and evolve your belief systems.",
      route: "#",
    },
    {
      title: "🥦 Meal Planner",
      description: "Plan your meals with intention and care.",
      route: "/MealPlanning",
    },
    {
      title: "📦 Food Inventory",
      description: "Track what you have and what you need.",
      route: "/FoodInventory",
    },
    {
      title: "🛒 Grocery List",
      description: "Organize your grocery trips based on your inventory and plans.",
      route: "/GroceryList",
    },
    {
      title: "📚 Journal Archive",
      description: "View and reflect on past entries.",
      route: "/journal",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">🧘 I AM</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            These are your personal tools — designed to help you reflect, grow, and take care of yourself.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {tools.map((tool, idx) => (
            <button
              key={idx}
              onClick={() => tool.route !== "#" && navigate(tool.route)}
              className={`p-4 rounded-xl shadow transition-all text-left ${
                tool.route !== "#"
                  ? "bg-green-100 dark:bg-green-800 hover:scale-105"
                  : "bg-gray-200 dark:bg-gray-700 cursor-not-allowed"
              }`}
              disabled={tool.route === "#"}
            >
              <h2 className="text-xl font-semibold mb-1">{tool.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">{tool.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
