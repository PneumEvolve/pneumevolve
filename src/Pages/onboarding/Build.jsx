// /pages/Build.jsx
import React from "react";

const buildTasks = [
  { name: "Smart Journal backend", difficulty: "medium", path: "gardener" },
  { name: "Group join system", difficulty: "hard", path: "weaver" },
  { name: "Proposal voting engine", difficulty: "hard", path: "builder" },
  { name: "SEED token ledger", difficulty: "hard", path: "player" },
  { name: "Lyra soul memory system", difficulty: "advanced", path: "seeker" },
];

export default function Build() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      <h1 className="text-4xl font-bold text-center">Join the Build Team</h1>
      <p className="text-center text-lg text-gray-600">
        PneumEvolve is alive and growing. Want to help shape it? Here are some open tasks:
      </p>

      <div className="space-y-4">
        {buildTasks.map((task, i) => (
          <div
            key={i}
            className="border rounded-xl p-4 bg-white flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold">{task.name}</h3>
              <p className="text-sm text-gray-500">Path: {task.path} | Difficulty: {task.difficulty}</p>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              I want to help
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
