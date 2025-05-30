// src/pages/WePlan.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

const WePlan = () => {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState([]);
  const [newIdea, setNewIdea] = useState("");
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState(null);
  const [discussion, setDiscussion] = useState({});
  const [commentInput, setCommentInput] = useState("");
  const [synthesized, setSynthesized] = useState("");

  const handleIdeaSubmit = () => {
    if (!newIdea.trim()) return;
    setIdeas([...ideas, newIdea]);
    setNewIdea("");
  };

  const handleCommentSubmit = () => {
    if (!commentInput.trim()) return;
    const idea = ideas[selectedIdeaIndex];
    const updated = { ...discussion };
    updated[idea] = [...(updated[idea] || []), commentInput];
    setDiscussion(updated);
    setCommentInput("");
  };

  const synthesizeDiscussion = () => {
    const comments = discussion[ideas[selectedIdeaIndex]] || [];
    // 🧠 Replace with backend call in future
    setSynthesized(`AI Summary: This idea has ${comments.length} comments exploring its strengths and risks. Some common themes include collaboration, implementation, and scalability.`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 dark:text-white">
      <h1 className="text-4xl font-bold text-center mb-4">🧠 We Plan</h1>
      <p className="text-center mb-6 text-gray-600 dark:text-gray-300">
        A synthesis engine for self-sufficiency. Propose ideas. Discuss. Summarize. Build.
      </p>

      <div className="mb-6">
        <textarea
          placeholder="Propose a new idea..."
          className="w-full p-3 border rounded dark:bg-gray-800 dark:text-white"
          value={newIdea}
          onChange={(e) => setNewIdea(e.target.value)}
        />
        <Button className="mt-2" onClick={handleIdeaSubmit}>
          Submit Idea
        </Button>
      </div>

      {ideas.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-2">🧾 Ideas</h2>
          <ul className="mb-6 space-y-2">
            {ideas.map((idea, i) => (
              <li
                key={i}
                className={`p-3 border rounded cursor-pointer ${selectedIdeaIndex === i ? "bg-blue-100 dark:bg-blue-900" : "bg-white dark:bg-gray-800"}`}
                onClick={() => {
                  setSelectedIdeaIndex(i);
                  setSynthesized("");
                }}
              >
                {idea}
              </li>
            ))}
          </ul>
        </>
      )}

      {selectedIdeaIndex !== null && (
        <>
          <h2 className="text-xl font-bold mb-2">💬 Discussion</h2>
          <div className="space-y-2 mb-4">
            {(discussion[ideas[selectedIdeaIndex]] || []).map((c, idx) => (
              <p key={idx} className="bg-gray-100 dark:bg-gray-700 p-2 rounded">{c}</p>
            ))}
          </div>
          <textarea
            placeholder="Add a comment..."
            className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white mb-2"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
          />
          <Button onClick={handleCommentSubmit}>Comment</Button>

          <div className="mt-6">
            <Button onClick={synthesizeDiscussion}>🧪 Summarize Discussion</Button>
            {synthesized && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 rounded">
                <strong>Synthesis:</strong> {synthesized}
              </div>
            )}
          </div>
        </>
      )}

      <div className="mt-10">
        <Button onClick={() => navigate("/experiments")}>
          ← Back to Experiments
        </Button>
      </div>
    </div>
  );
};

export default WePlan;