import React from "react";
import { api } from "@/lib/api";

export default function ProblemCard({ problem, onVote }) {
  const handleVote = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/problems/${problem.id}/vote`, {
        user_id: "anon-user", // Replace with real user if you add auth
        vote_type: "upvote",
      });
      onVote(problem.id);
    } catch (err) {
      console.error("Error voting:", err);
    }
  };

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="font-bold text-lg">{problem.title}</h3>
      {problem.description && <p className="text-sm text-gray-700 mt-1">{problem.description}</p>}
      <div className="flex items-center justify-between mt-2">
        <span className="text-blue-600 font-semibold">Votes: {problem.vote_count}</span>
        <button
          onClick={handleVote}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
        >
          Upvote
        </button>
      </div>
    </div>
  );
}