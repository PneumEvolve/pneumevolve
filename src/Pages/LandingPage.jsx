import React from "react";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();

  const tools = [
    { name: "I AM", emoji: "🪞", desc: "Smart Journal", path: "/iam" },
    { name: "We Talk", emoji: "🗣️", desc: "Public Forum", path: "/wetalk" },
    { name: "We Green", emoji: "🌱", desc: "Garden Directory", path: "/green/gardens" },
    { name: "We Plan", emoji: "🍽️", desc: "Meal Planner", path: "/mealplanner" },
    { name: "We Dream", emoji: "💡", desc: "Dream Machine", path: "/wedream" },
    { name: "We Build", emoji: "🧱", desc: "DAO Hub", path: "/webuild" },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-800 p-6 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-center mb-6">PneumEvolve</h1>
      <p className="text-lg text-center mb-10 max-w-xl">
        PneumEvolve is a living ecosystem of tools, visions, and choices for the New Earth.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl">
        {tools.map((tool) => (
          <div
            key={tool.name}
            onClick={() => navigate(tool.path)}
            className="cursor-pointer border rounded-xl p-4 hover:shadow-md transition"
          >
            <div className="text-3xl mb-2">{tool.emoji}</div>
            <h2 className="font-semibold text-xl">{tool.name}</h2>
            <p className="text-gray-600">{tool.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 text-sm text-gray-500 text-center max-w-md">
        <p className="italic mb-2">"We are not waiting for change — we are remembering the truth."</p>
        <p className="text-xs">Built by dreamers. Grown by gardeners. Chosen by you.</p>
        <p className="text-xs mt-1">PneumEvolve is open-source, evolving, and alive.</p>
      </div>
    </div>
  );
};

export default LandingPage;