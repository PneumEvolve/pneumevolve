// src/pages/WePlan.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function WePlan() {
  const navigate = useNavigate();

  const [ideas, setIdeas] = useState([]);
  const [newIdea, setNewIdea] = useState("");
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState(null);

  const [discussion, setDiscussion] = useState({}); // { [ideaText]: string[] }
  const [commentInput, setCommentInput] = useState("");
  const [synthesized, setSynthesized] = useState("");

  const selectedIdea = useMemo(
    () => (selectedIdeaIndex != null ? ideas[selectedIdeaIndex] : null),
    [ideas, selectedIdeaIndex]
  );

  function handleIdeaSubmit(e) {
    e?.preventDefault?.();
    const text = newIdea.trim();
    if (!text) return;
    setIdeas((prev) => [...prev, text]);
    setNewIdea("");
    // auto-select the idea if none selected yet
    if (selectedIdeaIndex == null) setSelectedIdeaIndex(0);
  }

  function handleCommentSubmit(e) {
    e?.preventDefault?.();
    if (!selectedIdea) return;
    const text = commentInput.trim();
    if (!text) return;
    setDiscussion((prev) => ({
      ...prev,
      [selectedIdea]: [...(prev[selectedIdea] || []), text],
    }));
    setCommentInput("");
  }

  function synthesizeDiscussion() {
    if (!selectedIdea) return;
    const comments = discussion[selectedIdea] || [];
    // 🧠 Placeholder synthesis; wire to backend later
    setSynthesized(
      `AI Summary: This idea has ${comments.length} comment${
        comments.length === 1 ? "" : "s"
      } exploring its strengths and risks. Themes include collaboration, implementation, and scalability.`
    );
  }

  function clearBoard() {
    if (!window.confirm("Clear all ideas and discussion?")) return;
    setIdeas([]);
    setSelectedIdeaIndex(null);
    setDiscussion({});
    setCommentInput("");
    setSynthesized("");
  }

  return (
    <div className="main p-6 space-y-6">
      {/* Header */}
      <header className="section-bar flex items-center justify-between gap-3">
        <h1 className="m-0">🧠 We Plan</h1>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary text-xs sm:text-sm" onClick={() => navigate("/experiments")}>
            ← Back to Experiments
          </button>
          {ideas.length > 0 && (
            <button className="btn btn-secondary text-xs sm:text-sm" onClick={clearBoard}>
              Reset Board
            </button>
          )}
        </div>
      </header>

      {/* Intro */}
      <section className="card">
        <p className="m-0">
          A synthesis engine for self-sufficiency. Propose ideas. Discuss. Summarize. Build.
        </p>
      </section>

      {/* New idea composer */}
      <section className="card space-y-3">
        <label className="block text-sm font-medium">Propose a new idea</label>
        <form onSubmit={handleIdeaSubmit} className="space-y-3">
          <textarea
            rows={4}
            placeholder="Write a concise idea…"
            value={newIdea}
            onChange={(e) => setNewIdea(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setNewIdea("")}
              disabled={!newIdea.trim()}
            >
              Clear
            </button>
            <button type="submit" className="btn" disabled={!newIdea.trim()}>
              Submit Idea
            </button>
          </div>
        </form>
      </section>

      {/* Ideas list */}
      {ideas.length > 0 ? (
        <section className="space-y-3">
          <div className="section-bar">🧾 Ideas</div>
          <ul className="grid sm:grid-cols-2 gap-3">
            {ideas.map((idea, i) => {
              const selected = i === selectedIdeaIndex;
              return (
                <li key={`${idea}-${i}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIdeaIndex(i);
                      setSynthesized("");
                    }}
                    aria-pressed={selected}
                    className={`card text-left w-full transition ${
                      selected ? "ring-1 ring-[color:var(--ring)]" : ""
                    }`}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <div className="font-medium">{idea}</div>
                    {selected && <div className="text-xs opacity-70 mt-1">Selected</div>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="card opacity-70 text-sm">
          No ideas yet. Add one above to get started.
        </section>
      )}

      {/* Discussion + Synthesis */}
      {selectedIdea && (
        <section className="space-y-6">
          {/* Discussion thread */}
          <div className="space-y-3">
            <div className="section-bar">💬 Discussion</div>

            <div className="space-y-2">
              {(discussion[selectedIdea] || []).length === 0 ? (
                <div className="card opacity-70 text-sm">No comments yet.</div>
              ) : (
                <ul className="space-y-2">
                  {(discussion[selectedIdea] || []).map((c, idx) => (
                    <li key={idx} className="card">
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={handleCommentSubmit} className="card space-y-2">
              <label className="block text-sm font-medium">Add a comment</label>
              <textarea
                rows={3}
                placeholder="Share feedback, risks, dependencies, or next steps…"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleCommentSubmit();
                  }
                }}
              />
              <div className="flex justify-end">
                <button className="btn" disabled={!commentInput.trim()}>
                  Comment
                </button>
              </div>
            </form>
          </div>

          {/* Synthesis */}
          <div className="space-y-3">
            <div className="section-bar">🧪 Synthesis</div>
            <div className="card flex items-center justify-between gap-3">
              <div className="text-sm opacity-80">
                Generate a quick summary of the current discussion.
              </div>
              <button className="btn" onClick={synthesizeDiscussion} disabled={!(discussion[selectedIdea] || []).length}>
                Summarize Discussion
              </button>
            </div>

            {synthesized && (
              <div className="card">
                <div className="font-medium mb-1">Synthesis</div>
                <p className="m-0">{synthesized}</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}