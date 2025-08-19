import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Dialog } from "@headlessui/react";
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
  const [notesRev, setNotesRev] = useState(0); // force ReactMarkdown re-render

  // collapsibles
  const [showMeta, setShowMeta] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [showConversation, setShowConversation] = useState(true);

  // delete modal
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const STATUS_OPTIONS = ["Proposed", "Brainstorming", "Working On", "Complete"];

  const canEditStatus =
    userEmail && (userEmail === idea.user_email || userEmail === "sheaklipper@gmail.com");
  const canDelete =
    userEmail && (userEmail === idea.user_email || userEmail === "sheaklipper@gmail.com");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/forge/ideas/${id}`);
        if (cancelled) return;
        setIdea(res.data);
        setNotes(res.data?.notes || "");
        setNotesRev((n) => n + 1);
      } catch (err) {
        console.error("Error fetching idea:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSaveMeta = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.put(
        `/forge/ideas/${id}`,
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
      const res = await api.post(
        `/forge/ideas/${id}/notes`,
        { content: notes },
        { headers: { "x-user-email": userEmail } }
      );
      const updated = res?.data?.notes ?? notes;
      setIdea((prev) => ({ ...prev, notes: updated }));
      setNotes(updated);
      setNotesRev((n) => n + 1);
      setIsEditingNotes(false);
    } catch (err) {
      console.error("Error saving notes:", err);
      alert("Failed to save notes.");
    }
  };

  const changeStatus = async (next) => {
    if (next === idea.status) return;
    try {
      await api.patch(
        `/forge/ideas/${idea.id}/status`,
        { status: next },
        { headers: { "x-user-email": userEmail } }
      );
      setIdea((prev) => ({ ...prev, status: next })); // optimistic update
    } catch (e) {
      console.error(e);
      alert("Failed to update status.");
    }
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/forge/ideas/${idea.id}`, {
        headers: { "x-user-email": userEmail },
      });
      setDeleting(false);
      setShowDelete(false);
      navigate("/forge");
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleting(false);
      alert("Failed to delete idea.");
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="main space-y-6">
        {/* Top bar */}
        <div className="section-bar flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">{idea.title || "Idea Details"}</h1>

          <div className="flex items-center gap-2">
            <span className="badge">Status: {idea.status}</span>
            {canEditStatus && (
              <select
                className="border rounded px-2 py-1"
                value={idea.status}
                onChange={(e) => changeStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-2">
            {canDelete && (
              <button className="btn btn-danger" onClick={() => setShowDelete(true)}>
                Delete
              </button>
            )}
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
        <Collapsible title="In-depth Notes" open={showNotes} onToggle={() => setShowNotes((s) => !s)}>
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
                  key={notesRev}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    h1: ({ children }) => <h1 className="text-3xl font-bold mt-6 mb-3">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-2xl font-semibold mt-5 mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xl font-semibold mt-4 mb-2">{children}</h3>,
                    p: ({ children }) => <p className="mt-3 leading-7">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc ml-6 mt-3 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal ml-6 mt-3 space-y-1">{children}</ol>,
                    a: ({ href, children }) => (
                      <a className="hover:underline" href={href} target="_blank" rel="noreferrer">
                        {children}
                      </a>
                    ),
                    code: ({ inline, children }) =>
                      inline ? (
                        <code className="px-1 py-0.5 rounded border">{children}</code>
                      ) : (
                        <code className="block p-3 rounded border overflow-auto">{children}</code>
                      ),
                  }}
                >
                  {idea.notes || ""}
                </ReactMarkdown>
              </div>
              {userEmail && (
                <div className="flex justify-end">
                  <button
                    className="btn mt-4"
                    onClick={() => {
                      setNotes(idea.notes || "");
                      setIsEditingNotes(true);
                    }}
                  >
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

      {/* Delete confirmation modal */}
      <Dialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <Dialog.Panel className="relative z-10 w-full max-w-md mx-4 rounded-xl card p-6">
          <Dialog.Title className="text-lg font-semibold">
            Delete “{idea.title || "this idea"}”?
          </Dialog.Title>
          <p className="mt-2 text-sm opacity-80">
            This action can’t be undone. The idea and its data will be permanently removed.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowDelete(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={confirmDelete} className="btn btn-danger" disabled={deleting} autoFocus>
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Dialog.Panel>
      </Dialog>
    </div>
  );
}