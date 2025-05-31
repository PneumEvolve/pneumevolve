// src/pages/WeLearn.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

const WeLearn = () => {
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setSummary(null);

    // Mock placeholder response
    setTimeout(() => {
      setSummary({
        what: "This bill proposes universal free access to public transportation within city limits.",
        impact: "It will primarily impact urban residents, local governments, and transit operators.",
        pros: "Reduces traffic, lowers emissions, helps low-income communities.",
        cons: "High initial cost, possible strain on transit systems.",
        controversy: "Some argue it's unfair to rural taxpayers or fiscally irresponsible.",
        importance: "Understanding this bill is key to shaping sustainable cities.",
      });
      setLoading(false);
    }, 1500); // simulate API delay
  };

  return (
    <div className="max-w-4xl mx-auto p-6 dark:text-black text-center">
      <h1 className="text-4xl font-bold mb-4">📘 We Learn</h1>
      <p className="mb-6 text-lg text-black dark:text-black">
        Paste a bill, policy, or idea — and receive a clear, neutral breakdown.
      </p>

      <textarea
        className="w-full p-4 border rounded mb-4 dark:bg-gray-800 dark:text-white"
        rows={6}
        placeholder="Paste your policy, legislation, or proposal text here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <Button onClick={handleAnalyze} disabled={loading}>
        {loading ? "Analyzing..." : "Interpret Policy"}
      </Button>

      {summary && (
        <div className="mt-6 text-left space-y-4 bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h2 className="text-xl font-semibold">🔍 What it says</h2>
          <p>{summary.what}</p>

          <h2 className="text-xl font-semibold">👥 Who it impacts</h2>
          <p>{summary.impact}</p>

          <h2 className="text-xl font-semibold">✅ Pros</h2>
          <p>{summary.pros}</p>

          <h2 className="text-xl font-semibold">⚠️ Cons</h2>
          <p>{summary.cons}</p>

          <h2 className="text-xl font-semibold">🤔 Controversy</h2>
          <p>{summary.controversy}</p>

          <h2 className="text-xl font-semibold">🌍 Why it matters</h2>
          <p>{summary.importance}</p>
        </div>
      )}

      <div className="mt-10">
        <Button onClick={() => navigate("/experiments")}>
          ← Back to Experiments
        </Button>
      </div>
    </div>
  );
};

export default WeLearn;