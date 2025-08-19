import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ProblemCard from "./ProblemCard";

export default function ProblemList() {
  const [problems, setProblems] = useState([]);

  const fetchProblems = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/problems`);
      setProblems(res.data);
    } catch (err) {
      console.error("Error fetching problems:", err);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  const handleVote = (id) => {
    setProblems((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, vote_count: p.vote_count + 1 } : p
      )
    );
  };

  return (
    <div className="space-y-4 mt-4">
      {problems.map((p) => (
        <ProblemCard key={p.id} problem={p} onVote={handleVote} />
      ))}
    </div>
  );
}