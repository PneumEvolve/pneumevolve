import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import IdeaConversation from "@/components/IdeaConversation";

const API = import.meta.env.VITE_API_URL;

function Collapsible({ title, open, onToggle, children }) {
  return (
    <div className="card p-0 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="btn btn-muted w-full rounded-none flex items-center justify-between text-left"
      >
        <span className="font-semibold">{title}</span>
        <span className="text-2xl leading-none select-none">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

export default function ForgeIdeaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userEmail } = useAuth();

  const [idea, setIdea] = useState({ id: Number(id), title: "", description: "", notes: "" });
  const [loading, setLoading] = useState(false);

  // notes editing
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // collapsibles
  const [showMeta, setShowMeta] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [showConversation, setShowConversation] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API}/forge/ideas/${id}`);
        if (cancelled) return;
        setIdea(res.data);
        setNotes(res.data?.notes || "");
      } catch (err) {
        console.error("Error fetching idea:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleSaveMeta = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put(
        `${API}/forge/ideas/${id}`,
        { title: idea.title, description: idea.description },
        { headers: { "x-user-email": userEmail } }
      );
    } catch (err) {
      console.error("Error updating idea:", err);
      alert("Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      const res = await axios.post(`${API}/forge/ideas/${id}/notes`, { content: notes });
      setIdea((prev) => ({ ...prev, notes: res.data.notes }));
      setIsEditingNotes(false);
    } catch (err) {
      console.error("Error saving notes:", err);
      alert("Failed to save notes.");
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="main space-y-6">
        {/* Top bar */}
        <div className="section-bar flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">{idea.title || "Idea Details"}</h1>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => navigate("/forge")}>
              ← Back to Forge
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <Collapsible
          title="Title & Description"
          open={showMeta}
          onToggle={() => setShowMeta((s) => !s)}
        >
          <form onSubmit={handleSaveMeta} className="space-y-3">
            <div>
              <label className="block text-sm opacity-75 mb-1">Title</label>
              <input
                type="text"
                value={idea.title}
                onChange={(e) => setIdea((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Idea Title"
                disabled={!userEmail}
              />
            </div>
            <div>
              <label className="block text-sm opacity-75 mb-1">Description</label>
              <textarea
                rows={4}
                value={idea.description}
                onChange={(e) => setIdea((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Idea Description"
                disabled={!userEmail}
              />
            </div>

            {userEmail ? (
              <div className="flex justify-end">
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? "Saving…" : "Save"}
                </button>
              </div>
            ) : (
              <div className="text-sm opacity-70">Log in to edit these fields.</div>
            )}
          </form>
        </Collapsible>

        {/* Notes */}
        <Collapsible
          title="In-depth Notes"
          open={showNotes}
          onToggle={() => setShowNotes((s) => !s)}
        >
          {isEditingNotes && userEmail ? (
            <div className="space-y-3">
              <textarea
                rows={12}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Use Markdown for structure…"
              />
              <div className="flex justify-end gap-2">
                <button className="btn" onClick={handleSaveNotes}>
                  Save Notes
                </button>
                <button className="btn btn-secondary" onClick={() => setIsEditingNotes(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    h1: (props) => <h1 className="text-3xl font-bold mt-6 mb-3" {...props} />,
                    h2: (props) => <h2 className="text-2xl font-semibold mt-5 mb-2" {...props} />,
                    h3: (props) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                    p: (props) => <p className="mt-3 leading-7" {...props} />,
                    ul: (props) => <ul className="list-disc ml-6 mt-3 space-y-1" {...props} />,
                    ol: (props) => <ol className="list-decimal ml-6 mt-3 space-y-1" {...props} />,
                    a: (props) => <a className="hover:underline" target="_blank" rel="noreferrer" {...props} />,
                    code: ({ inline, ...props }) =>
                      inline ? (
                        <code className="px-1 py-0.5 rounded border" {...props} />
                      ) : (
                        <code className="block p-3 rounded border overflow-auto" {...props} />
                      ),
                  }}
                >
                  {idea.notes || ""}
                </ReactMarkdown>
              </div>
              {userEmail && (
                <div className="flex justify-end">
                  <button className="btn mt-4" onClick={() => { setNotes(idea.notes || ""); setIsEditingNotes(true); }}>
                    Edit Notes
                  </button>
                </div>
              )}
            </div>
          )}
        </Collapsible>

        {/* Conversation */}
        <Collapsible
          title="Idea Conversation"
          open={showConversation}
          onToggle={() => setShowConversation((s) => !s)}
        >
          <IdeaConversation ideaId={idea.id} userEmail={userEmail} />
        </Collapsible>
      </div>
    </div>
  );
}