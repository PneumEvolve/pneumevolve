// src/pages/NotesPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import MarkdownBoundary from "@/components/MarkdownBoundary";

const API = import.meta.env.VITE_API_URL;

export default function NotesPage() {
  const { index } = useParams();
  const navigate = useNavigate();
  const { userEmail, accessToken } = useAuth();
  const isEditable = userEmail === "sheaklipper@gmail.com";

  const [sections, setSections] = useState([]);
  const [originalPlan, setOriginalPlan] = useState("");
  const [updatedPlan, setUpdatedPlan] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiThinking, setAiThinking] = useState(false);
  const [manualEdit, setManualEdit] = useState(false);
  const [streamedText, setStreamedText] = useState("");

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await api.get(`/living-plan`);
        const plan = res.data;
        setSections(plan);
        if (plan[parseInt(index)]) {
          const existingNotes = plan[parseInt(index)].notes || "";
          setOriginalPlan(existingNotes);
          setUpdatedPlan(existingNotes);
        } else {
          console.error("Invalid section index");
        }
      } catch (err) {
        console.error("Failed to load section:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSections();
  }, [parseInt(index)]);

  const handleAIPrompt = async () => {
  if (!userPrompt.trim()) return;
  setStreamedText("");
  setAiThinking(true);

  try {
    const fullPrompt = `
Rewrite the following idea plan based on the user's request.

Current Plan:
${originalPlan}

User Request:
${userPrompt}

Return only the updated plan in clean markdown. No explanations.
`;

    const res = await fetch("https://0f99b2fc0b17.ngrok-free.app/ollama", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "phi",
        prompt: fullPrompt,
        stream: true,
      }),
    });

    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // Extract just the "response" from each streamed line
      const matches = chunk.match(/"response":"(.*?)"/g);
      const newText = matches
        ? matches.map(x => x.replace(/"response":"|"/g, "").replace(/\\n/g, "\n")).join("")
        : chunk.replace(/\\n/g, "\n");

      fullText += newText;
      setStreamedText((prev) => prev + newText);
    }

    // ✅ Set final updated plan once streaming is fully complete
    setUpdatedPlan(fullText);

  } catch (err) {
    console.error("AI update failed:", err);
    alert("Failed to get update from Lyra.");
  } finally {
    setAiThinking(false); // ✅ Always clear spinner
  }
};

  const handleSave = async () => {
  try {
    const updated = [...sections];
    const i = parseInt(index);

    // Sync updated plan into backend fields
    updated[i].description = updatedPlan;
    updated[i].notes = updatedPlan;

    await api.post(`/living-plan`, updated, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // ✅ Update local section state and originalPlan to show saved update immediately
    setSections(updated);
    setOriginalPlan(updatedPlan); // ← this makes the left panel update instantly

    alert("Updated plan saved!");
  } catch (err) {
    alert("Failed to save updated plan.");
    console.error(err);
  }
};

  function safeMarkdown(text) {
  try {
    // Strip HTML tags and escape if needed
    return text
      .replace(/<[^>]+>/g, "")        // remove raw HTML
      .replace(/\0/g, "");            // remove null bytes
  } catch (err) {
    console.warn("Markdown sanitization failed:", err);
    return "";
  }
}


  if (loading) return <p className="text-center mt-10 text-gray-500">Loading plan...</p>;

  const section = sections[parseInt(index)];
  if (!section) return <p className="text-center text-red-500">Section not found.</p>;

  return (
  <div className="max-w-4xl mx-auto p-6 space-y-6">
    <h1 className="text-3xl font-bold">🌱 Idea Plan: {section.title || `Section ${index}`}</h1>

    {/* Grid with Original + Updated Plan */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Original Plan */}
      <div className="border rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-lg font-semibold mb-2">Original Plan</h2>
        <MarkdownBoundary>
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-2" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mb-2" {...props} />,
              p: ({ node, ...props }) => <p className="mb-2" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc ml-6 mb-2" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal ml-6 mb-2" {...props} />,
              li: ({ node, ...props }) => <li className="mb-1" {...props} />,
              a: ({ node, ...props }) => (
      <a
        {...props}
        className="text-blue-600 underline hover:text-blue-800"
        target="_blank"
        rel="noopener noreferrer"
      />
    ),
              code: ({ node, ...props }) => (
                
                <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props} />
              ),
              pre: ({ node, ...props }) => (
                <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto text-sm" {...props} />
              )
            }}
          >
            {safeMarkdown(originalPlan)}
          </ReactMarkdown>
        </MarkdownBoundary>
      </div>

      {/* Updated Plan */}
      <div className="border rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-lg font-semibold mb-2">Updated Plan</h2>

        {isEditable && (
          <button
            onClick={() => setManualEdit(!manualEdit)}
            className="text-xs text-blue-600 hover:underline mb-2"
          >
            {manualEdit ? "📄 View Rendered" : "✍️ Edit Markdown"}
          </button>
        )}

        {manualEdit ? (
          <textarea
            className="w-full h-[300px] border rounded p-2 bg-gray-50 dark:bg-gray-800 dark:text-white"
            value={updatedPlan}
            onChange={(e) => setUpdatedPlan(e.target.value)}
          />
        ) : (
          <MarkdownBoundary>
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-2" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mb-2" {...props} />,
                p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc ml-6 mb-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal ml-6 mb-2" {...props} />,
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                a: ({ node, ...props }) => (
      <a
        {...props}
        className="text-blue-600 underline hover:text-blue-800"
        target="_blank"
        rel="noopener noreferrer"
      />
    ),
                code: ({ node, ...props }) => (
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props} />
                ),
                pre: ({ node, ...props }) => (
                  <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto text-sm" {...props} />
                )
              }}
            >
              {safeMarkdown(streamedText || updatedPlan)}
            </ReactMarkdown>
          </MarkdownBoundary>
        )}
      </div>
    </div> {/* ←✅ This was the missing div! */}

    {/* Editable Section Below the Grid */}
    {isEditable && (
      <>
        <div className="space-y-2">
          <label className="block text-sm font-semibold">Suggest a Change</label>
          <textarea
            className="w-full border rounded p-2 min-h-[100px] bg-white dark:bg-gray-800 dark:text-white"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Describe how you want to evolve this idea..."
          />
          <button
            onClick={handleAIPrompt}
            disabled={aiThinking}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {aiThinking ? "Thinking..." : "Update with AI ✨"}
          </button>
        </div>

        <div className="flex justify-between mt-4">
          <button
            onClick={() => navigate("/livingplan")}
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back
          </button>
          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Save Plan ✅
          </button>
        </div>
      </>
    )}
  </div>
);
}