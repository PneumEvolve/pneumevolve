// src/pages/WeChoose.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const WeChoose = () => {
  const [ideas, setIdeas] = useState([]);
  const [newIdea, setNewIdea] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (newIdea.trim().length < 5) return alert("Make your idea a bit clearer.");
    const idea = {
      id: Date.now(),
      content: newIdea.trim(),
      votes: 0,
    };
    setIdeas([idea, ...ideas]);
    setNewIdea("");
  };

  const vote = (id, delta) => {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === id ? { ...idea, votes: idea.votes + delta } : idea
      )
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 text-center dark:text-white">
      <h1 className="text-4xl font-bold mb-4">🌍 We Choose</h1>
      <p className="mb-6 text-lg text-gray-600 dark:text-gray-300">
        Upload ideas for the betterment of all. Vote on what should rise.
      </p>

      {/* Idea Submission */}
      <textarea
        className="w-full p-3 border rounded mb-4 dark:bg-gray-800 dark:text-white"
        placeholder="What do you want to see built, fixed, changed, or shared?"
        value={newIdea}
        onChange={(e) => setNewIdea(e.target.value)}
      />
      <Button onClick={handleSubmit}>Submit Idea</Button>

      <hr className="my-8" />

      {/* Idea Feed */}
      <h2 className="text-2xl font-semibold mb-4">💡 Submitted Ideas</h2>
      {ideas.length === 0 ? (
        <p className="text-gray-500 italic">No ideas yet. Be the first to spark change.</p>
      ) : (
        <ul className="space-y-4">
          {ideas.map((idea) => (
            <li
              key={idea.id}
              className="bg-white dark:bg-gray-800 p-4 rounded shadow flex justify-between items-center"
            >
              <div className="text-left">
                <p className="text-lg">{idea.content}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {idea.votes} vote{idea.votes !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Button onClick={() => vote(idea.id, 1)} className="bg-green-600 hover:bg-green-700">
                  👍
                </Button>
                <Button onClick={() => vote(idea.id, -1)} className="bg-red-600 hover:bg-red-700">
                  👎
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Back Navigation */}
      <div className="mt-8">
        <Button onClick={() => navigate("/experiments")}>
          ← Back to Experiments
        </Button>
      </div>
    </div>
  );
};

export default WeChoose;