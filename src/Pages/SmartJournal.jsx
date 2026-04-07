// src/Pages/SmartJournal.jsx
// Simplified journal — AI insight features removed until a new API is wired up
 
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
 
export default function SmartJournal() {
  const [entries, setEntries] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
 
  const { userProfile, isLoggedIn } = useAuth();
  const navigate = useNavigate();
 
  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    fetchEntries();
  }, [isLoggedIn]);
 
  async function fetchEntries() {
    try {
      const res = await api.get("/journal");
      setEntries(res.data);
    } catch {
      setError("Couldn't load your journal entries.");
    } finally {
      setLoading(false);
    }
  }
 
  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      const res = await api.post("/journal", { title: newTitle.trim(), content: newContent.trim() });
      setEntries(prev => [res.data, ...prev]);
      setNewTitle("");
      setNewContent("");
    } catch {
      setError("Couldn't save entry. Try again.");
    } finally {
      setSaving(false);
    }
  }
 
  async function handleEditSave(id) {
    try {
      const res = await api.put(`/journal/${id}`, {
        title: editTitle,
        content: editContent,
      });
      setEntries(prev => prev.map(e => e.id === id ? res.data : e));
      setEditingId(null);
    } catch {
      setError("Couldn't update entry.");
    }
  }
 
  async function handleDelete(id) {
    try {
      await api.delete(`/journal/${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
      setConfirmDeleteId(null);
    } catch {
      setError("Couldn't delete entry.");
    }
  }
 
  function startEdit(entry) {
    setEditingId(entry.id);
    setEditTitle(entry.title);
    setEditContent(entry.content);
    setExpandedId(entry.id);
  }
 
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-[var(--text)]">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">
        {userProfile?.username ? `${userProfile.username}'s Journal` : "Journal"}
      </h1>
      <p className="text-sm text-[var(--muted)] mb-8">
        Write your truth. It stays yours.
      </p>
 
      {/* New entry form */}
      <form onSubmit={handleCreate} className="space-y-3 mb-10">
        <input
          type="text"
          placeholder="Title"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--text)] transition"
        />
        <textarea
          rows={6}
          placeholder="What's on your mind..."
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--text)] transition resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--muted)]">{newContent.length} characters</span>
          <button
            type="submit"
            disabled={saving || !newTitle.trim() || !newContent.trim()}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-sm font-medium shadow-sm hover:shadow transition disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save entry"}
          </button>
        </div>
      </form>
 
      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 mb-4">{error}</p>
      )}
 
      {/* Entries */}
      {loading ? (
        <p className="text-sm text-[var(--muted)] text-center py-8">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--muted)] text-center py-8 italic">
          No entries yet — what's on your mind?
        </p>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5"
            >
              {editingId === entry.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--text)] transition"
                  />
                  <textarea
                    rows={6}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--text)] transition resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditSave(entry.id)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                    >
                      Save changes
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium opacity-50 hover:opacity-80 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3
                      className="text-base font-semibold cursor-pointer hover:opacity-70 transition"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                      {entry.title}
                    </h3>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(entry)}
                        className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(entry.id)}
                        className="text-xs text-red-400 hover:text-red-600 transition"
                      >
                        delete
                      </button>
                    </div>
                  </div>
 
                  <p className="text-xs text-[var(--muted)] mb-3">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
 
                  {expandedId === entry.id && (
                    <p className="text-sm leading-7 whitespace-pre-wrap text-[var(--text)]">
                      {entry.content}
                    </p>
                  )}
 
                  {expandedId !== entry.id && (
                    <p
                      className="text-sm text-[var(--muted)] cursor-pointer hover:opacity-80 transition line-clamp-2"
                      onClick={() => setExpandedId(entry.id)}
                    >
                      {entry.content}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
 
      {/* Delete confirm modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl">
            <p className="text-sm leading-6">
              Delete this journal entry? This can't be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="rounded-xl border border-red-400/40 text-red-500 px-4 py-2 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium hover:shadow transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}