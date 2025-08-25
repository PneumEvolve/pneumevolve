// src/pages/WeLearn.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function WeLearn() {
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
        what:
          "This bill proposes universal free access to public transportation within city limits.",
        impact:
          "It will primarily impact urban residents, local governments, and transit operators.",
        pros:
          "Reduces traffic, lowers emissions, helps low-income communities.",
        cons: "High initial cost, possible strain on transit systems.",
        controversy:
          "Some argue it's unfair to rural taxpayers or fiscally irresponsible.",
        importance: "Understanding this bill is key to shaping sustainable cities.",
      });
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="main p-6 space-y-6">
      {/* Header */}
      <header className="section-bar flex items-center justify-between gap-3">
        <h1 className="m-0">📘 We Learn</h1>
        <button
          className="btn btn-secondary text-xs sm:text-sm"
          onClick={() => navigate("/experiments")}
        >
          ← Back to Experiments
        </button>
      </header>

      {/* Instructions + Input */}
      <section className="card space-y-4">
        <p className="text-base">
          Paste a bill, policy, or idea — and receive a clear, neutral
          breakdown.
        </p>

        <textarea
          rows={8}
          placeholder="Paste your policy, legislation, or proposal text here…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setInput("")}
            disabled={!input || loading}
          >
            Clear
          </button>
          <button
            className="btn"
            onClick={handleAnalyze}
            disabled={loading || !input.trim()}
            aria-busy={loading ? "true" : "false"}
          >
            {loading ? "Analyzing…" : "Interpret Policy"}
          </button>
        </div>
      </section>

      {/* Results */}
      {summary && (
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold m-0">Summary</h2>
          <div className="grid gap-3">
            <div>
              <div className="font-medium">🔍 What it says</div>
              <p className="m-0">{summary.what}</p>
            </div>
            <div>
              <div className="font-medium">👥 Who it impacts</div>
              <p className="m-0">{summary.impact}</p>
            </div>
            <div>
              <div className="font-medium">✅ Pros</div>
              <p className="m-0">{summary.pros}</p>
            </div>
            <div>
              <div className="font-medium">⚠️ Cons</div>
              <p className="m-0">{summary.cons}</p>
            </div>
            <div>
              <div className="font-medium">🤔 Controversy</div>
              <p className="m-0">{summary.controversy}</p>
            </div>
            <div>
              <div className="font-medium">🌍 Why it matters</div>
              <p className="m-0">{summary.importance}</p>
            </div>
          </div>

          <div className="pt-2 border-t flex justify-end">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSummary(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Start Over
            </button>
          </div>
        </section>
      )}
    </div>
  );
}