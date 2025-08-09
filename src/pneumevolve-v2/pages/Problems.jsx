// /src/pneumevolve-v2/pages/Problems.jsx
import React, { useState } from "react";

export default function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [newProblem, setNewProblem] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newProblem.trim()) return;

    const problem = {
      id: Date.now(),
      text: newProblem,
      createdAt: new Date().toISOString(),
    };

    setProblems([problem, ...problems]);
    setNewProblem("");
  };

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">📣 Problem Page</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            Post a problem — local, global, personal, political. If it's real to you, it's real.
            <br />
            Solutions aren't built yet. But naming the problem is the first step.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full p-3 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
            rows={4}
            placeholder="Describe a problem..."
            value={newProblem}
            onChange={(e) => setNewProblem(e.target.value)}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Submit Problem
          </button>
        </form>

        <div className="pt-8">
          <h2 className="text-2xl font-semibold mb-4">🗂️ Submitted Problems</h2>
          <div className="space-y-4">
            {problems.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400">No problems posted yet.</p>
            )}
            {problems.map((p) => (
              <div key={p.id} className="p-4 rounded bg-green-100 dark:bg-green-800">
                <p className="mb-1">{p.text}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Posted: {new Date(p.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
