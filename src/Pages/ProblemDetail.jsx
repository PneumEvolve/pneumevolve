// src/Pages/ProblemDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ConversationPanel from "@/components/ConversationPanel";

const asText = (x) => {
  if (x == null) return "";
  const t = typeof x;
  if (t === "string" || t === "number" || t === "boolean") return String(x);
  if (t === "object") {
    if (Object.prototype.hasOwnProperty.call(x, "value")) return String(x.value);
    if (Object.prototype.hasOwnProperty.call(x, "name")) return String(x.name);
  }
  try { return String(x); } catch { return ""; }
};
const val = (x) => (x && typeof x === "object" ? (x.value ?? x.name ?? String(x)) : x);

function CollapseHeader({ open, onToggle, children }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 rounded border hover:bg-[color-mix(in_oklab,var(--bg)_90%,transparent)]"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <span className="font-semibold">{children}</span>
      <span className="text-xs opacity-70">{open ? "▲" : "▼"}</span>
    </button>
  );
}

export default function ProblemDetail() {
  const { id } = useParams();
  const { userEmail, accessToken } = useAuth();

  const headers = useMemo(() => {
    const h = {};
    if (userEmail) h["x-user-email"] = userEmail;
    if (accessToken) h.Authorization = `Bearer ${accessToken}`;
    return h;
  }, [userEmail, accessToken]);

  // Problem
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Collapsibles
  const [openDetails, setOpenDetails] = useState(true);
  const [openSolutions, setOpenSolutions] = useState(true);
  const [openPledges, setOpenPledges] = useState(false);
  const [openNotes, setOpenNotes] = useState(false);
  const [openConversation, setOpenConversation] = useState(false);

  // Solutions composer
  const [solTitle, setSolTitle] = useState("");
  const [solDesc, setSolDesc] = useState("");
  const [solSubmitting, setSolSubmitting] = useState(false);

  // Notes composer
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [notePublic, setNotePublic] = useState(true);
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Pledges (optional API parity with ForgeItemPage)
  const [pledges, setPledges] = useState([]);
  const [pledgesErr, setPledgesErr] = useState("");
  const [loadingPledges, setLoadingPledges] = useState(true);
  const [pledgeText, setPledgeText] = useState("");
  const [addingPledge, setAddingPledge] = useState(false);
  const [marking, setMarking] = useState({}); // { [id]: bool }

  // Conversation
  const [conversationId, setConversationId] = useState(null);

  async function loadProblem() {
    if (!id) return;
    setLoading(true);
    setErr("");
    try {
      const res = await api.get(`/forge/problems/${id}`, { headers });
      setProblem(res.data);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || "Failed to load problem");
    } finally {
      setLoading(false);
    }
  }

  async function fetchPledges() {
    // If you don’t expose pledges for problems, this will just render “No pledges yet.”
    setLoadingPledges(true);
    setPledgesErr("");
    try {
      const res = await api.get(`/forge/problems/${id}/pledges`, { headers });
      const arr = Array.isArray(res.data) ? res.data : [];
      setPledges(arr);
    } catch (e) {
      // Don’t hard-fail the page; just surface a small message in the Pledges pane
      setPledges([]);
      setPledgesErr(e?.response?.data?.detail || "");
    } finally {
      setLoadingPledges(false);
    }
  }

  useEffect(() => {
    loadProblem();
    fetchPledges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- Solutions ---
  async function addSolution(e) {
    e?.preventDefault?.();
    if (!solTitle.trim() || !solDesc.trim()) return;
    setSolSubmitting(true);
    try {
      await api.post(
        `/forge/problems/${id}/solutions`,
        { title: solTitle.trim(), description: solDesc.trim(), anonymous: false, created_by_email: null },
        { headers }
      );
      setSolTitle("");
      setSolDesc("");
      await loadProblem();
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to add solution");
    } finally {
      setSolSubmitting(false);
    }
  }

  // --- Notes ---
  async function addNote(e) {
    e?.preventDefault?.();
    if (!noteBody.trim()) return;
    setNoteSubmitting(true);
    try {
      await api.post(
        `/forge/problems/${id}/notes`,
        { title: noteTitle.trim() || null, body: noteBody.trim(), is_public: !!notePublic, order_index: 0 },
        { headers }
      );
      setNoteTitle("");
      setNoteBody("");
      await loadProblem();
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to add note");
    } finally {
      setNoteSubmitting(false);
    }
  }
  async function updateNote(noteId, patch) {
    try {
      await api.patch(`/forge/problem-notes/${noteId}`, patch, { headers });
      await loadProblem();
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to update note");
    }
  }
  async function deleteNote(noteId) {
    if (!window.confirm("Delete this note?")) return;
    try {
      await api.delete(`/forge/problem-notes/${noteId}`, { headers });
      await loadProblem();
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to delete note");
    }
  }

  // --- Pledges (optional) ---
  async function handleAddPledge(e) {
    e?.preventDefault?.();
    const text = pledgeText.trim();
    if (!userEmail) return alert("Please log in to add a pledge.");
    if (!text) return;
    setAddingPledge(true);
    try {
      await api.post(`/forge/problems/${id}/pledges`, { text }, { headers });
      setPledgeText("");
      await fetchPledges();
    } catch (e) {
      alert(e?.response?.data?.detail || "Unable to add pledge.");
    } finally {
      setAddingPledge(false);
    }
  }
  async function markPledgeDone(pledgeId) {
    if (!userEmail) return;
    setMarking((m) => ({ ...m, [pledgeId]: true }));
    try {
      // If your backend uses a different endpoint for problem pledges, adjust here
      await api.patch(`/forge/pledges/${pledgeId}/done`, {}, { headers });
      setPledges((prev) =>
        prev.map((p) => (p.id === pledgeId ? { ...p, done: true, done_at: new Date().toISOString() } : p))
      );
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to mark pledge as done.");
    } finally {
      setMarking((m) => ({ ...m, [pledgeId]: false }));
    }
  }

  async function deletePledge(pledgeId) {
  if (!userEmail) return;
  if (!window.confirm("Delete this pledge?")) return;
  try {
    const wasDone = !!pledges.find(p => p.id === pledgeId)?.done;
    await api.delete(`/forge/pledges/${pledgeId}`, { headers });
    setPledges(prev => prev.filter(p => p.id !== pledgeId));
    // If you track counts on this page, adjust them here similarly.
  } catch (e) {
    alert(e?.response?.data?.detail || "Failed to delete pledge.");
  }
}

async function toggleSolutionVote(sol) {
  if (!userEmail) {
    alert("Please log in to vote on solutions.");
    return;
  }
  const hasVoted = !!sol.has_voted;
  const path = `/forge/solutions/${sol.id}/vote`;

  // optimistic UI
  setProblem((prev) => {
    if (!prev?.top_solutions) return prev;
    return {
      ...prev,
      top_solutions: prev.top_solutions.map((s) =>
        s.id === sol.id
          ? {
              ...s,
              has_voted: !hasVoted,
              votes_count: Math.max(0, (s.votes_count || 0) + (hasVoted ? -1 : 1)),
            }
          : s
      ),
    };
  });

  try {
    if (hasVoted) {
      await api.delete(path, { headers });
    } else {
      await api.post(path, {}, { headers });
    }
  } catch (e) {
    console.error("solution vote failed", e);
    // revert on failure
    setProblem((prev) => {
      if (!prev?.top_solutions) return prev;
      return {
        ...prev,
        top_solutions: prev.top_solutions.map((s) =>
          s.id === sol.id
            ? {
                ...s,
                has_voted: hasVoted,
                votes_count: Math.max(0, (s.votes_count || 0) + (hasVoted ? 1 : -1)),
              }
            : s
        ),
      };
    });
    alert(e?.response?.data?.detail || "Unable to vote on this solution.");
  }
}

  if (loading)
    return (
      <main className="max-w-3xl mx-auto p-6">
        <div className="opacity-70">Loading…</div>
      </main>
    );
  if (err)
    return (
      <main className="max-w-3xl mx-auto p-6">
        <div className="card border-amber-500/40">{String(err)}</div>
      </main>
    );
  if (!problem) return null;

  const {
    title,
    description,
    domain,
    scope,
    severity,
    status,
    created_at,
    created_by_username,
    created_by_email,
    notes = [],
    top_solutions = [],
  } = problem;

  const statusTxt = asText(status);
  const domainTxt = asText(domain);
  const scopeTxt = asText(scope);
  const descTxt = asText(description);

  const canDelete =
    !!userEmail &&
    (userEmail === "sheaklipper@gmail.com" ||
      userEmail.toLowerCase() === String(created_by_email || "").toLowerCase());

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Top bar (match ForgeItemPage) */}
      <div className="flex items-center justify-between">
        <Link to="/forge2" className="btn btn-secondary">
          ← Back to Forge
        </Link>
      </div>

      {/* ===== Details (title + description) ===== */}
      <section className="space-y-3">
        <CollapseHeader open={openDetails} onToggle={() => setOpenDetails((o) => !o)}>
          Details
        </CollapseHeader>
        {openDetails && (
          <div className="card p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs border-rose-500/40 text-rose-700 dark:text-rose-300">
                PROBLEM
              </span>
              {statusTxt && <span className="badge">Status: {val(statusTxt)}</span>}
            </div>

            <h1 className="text-3xl font-bold leading-tight">{asText(title)}</h1>
            <div className="text-xs opacity-70">
              {created_at ? new Date(created_at).toLocaleString() : ""}
              {(created_by_username || created_by_email) && (
                <> · {created_by_username || created_by_email}</>
              )}
            </div>

            {descTxt && <div className="mt-2 whitespace-pre-wrap">{descTxt}</div>}

            <div className="flex flex-wrap items-center gap-3 justify-between pt-2 border-t">
              <div className="text-sm opacity-80 flex items-center gap-3">
                {domainTxt && <span>Domain: {domainTxt}</span>}
                {scopeTxt && (
                  <>
                    <span>•</span>
                    <span>Scope: {scopeTxt}</span>
                  </>
                )}
                {typeof severity === "number" && (
                  <>
                    <span>•</span>
                    <span>Severity: {severity}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">{/* (space reserved for future actions) */}</div>
            </div>
          </div>
        )}
      </section>

      {/* ===== Solutions (open by default) ===== */}
      <section className="space-y-3">
        <CollapseHeader open={openSolutions} onToggle={() => setOpenSolutions((o) => !o)}>
          Solutions
        </CollapseHeader>
        {openSolutions && (
          <div className="space-y-3">
            <form onSubmit={addSolution} className="card p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium">Title</label>
                <input value={solTitle} onChange={(e) => setSolTitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium">Description</label>
                <textarea
                  rows={4}
                  value={solDesc}
                  onChange={(e) => setSolDesc(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end">
                <button className="btn" disabled={solSubmitting || !solTitle.trim() || !solDesc.trim()}>
                  {solSubmitting ? "Submitting…" : "Add Solution"}
                </button>
              </div>
            </form>

            {Array.isArray(top_solutions) && top_solutions.length > 0 && (
  <>
    <h3 className="text-md font-semibold">Top Solutions</h3>
    <ul className="space-y-2">
      {top_solutions.map((s) => (
        <li key={s.id} className="card p-3 flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">{asText(s.title)}</div>
            <div className="text-sm opacity-80 whitespace-pre-wrap">{asText(s.description)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={s.has_voted ? "btn btn-danger" : "btn btn-secondary"}
              onClick={() => toggleSolutionVote(s)}
              aria-pressed={!!s.has_voted}
              title={s.has_voted ? "Unvote" : "Vote"}
            >
              {s.has_voted ? "🙅 Unvote" : "👍 Vote"} · {s.votes_count ?? 0}
            </button>
          </div>
        </li>
      ))}
    </ul>
  </>
)}
          </div>
        )}
      </section>

      {/* ===== Pledges (collapsed by default) ===== */}
      <section className="space-y-3">
        <CollapseHeader open={openPledges} onToggle={() => setOpenPledges((o) => !o)}>
          Pledges
        </CollapseHeader>
        {openPledges && (
          <div className="space-y-3">
            {loadingPledges ? (
              <div className="opacity-70 text-sm">Loading pledges…</div>
            ) : pledgesErr ? (
              <div className="card border-amber-500/40 text-sm">{pledgesErr}</div>
            ) : pledges.length === 0 ? (
              <div className="opacity-70 text-sm">No pledges yet.</div>
            ) : (
              <ul className="space-y-2">
                {pledges.map((p) => (
                  <li key={p.id} className="card flex items-start justify-between gap-3">
                    <div>
                      <div className="whitespace-pre-wrap">{p.text}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {p.username ? `by ${p.username}` : p.user_email ? `by ${p.user_email}` : "by someone"} •{" "}
                        {p.created_at ? new Date(p.created_at).toLocaleString() : ""}
                        {p.done && (
                          <>
                            {" "}
                            <span>•</span>{" "}
                            <span className="inline-block px-2 py-0.5 rounded-full border text-[11px]">
                              Done {p.done_at ? `(${new Date(p.done_at).toLocaleString()})` : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {p.is_mine && (
  <div className="flex gap-2">
    {!p.done && (
      <button
        className="btn btn-secondary"
        onClick={() => markPledgeDone(p.id)}
        disabled={!!marking[p.id]}
      >
        {marking[p.id] ? "Marking…" : "Mark Done"}
      </button>
    )}
    <button
      className="btn btn-danger"
      onClick={() => deletePledge(p.id)}
      title="Delete pledge"
    >
      Delete
    </button>
  </div>
)}
                    
                  </li>
                ))}
              </ul>
            )}

            {/* Add pledge */}
            <form onSubmit={handleAddPledge} className="card space-y-2">
              <label className="text-sm font-medium">Add a pledge</label>
              <textarea
                rows={3}
                className="w-full"
                placeholder={userEmail ? "What will you do to help move this forward?" : "Log in to pledge…"}
                value={pledgeText}
                onChange={(e) => setPledgeText(e.target.value)}
                disabled={!userEmail || addingPledge}
              />
              <div className="flex justify-end">
                <button className="btn" disabled={!userEmail || addingPledge || !pledgeText.trim()}>
                  {addingPledge ? "Adding…" : "Add Pledge"}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* ===== Notes (collapsed by default) ===== */}
      <section className="space-y-3">
        <CollapseHeader open={openNotes} onToggle={() => setOpenNotes((o) => !o)}>
          Notes
        </CollapseHeader>
        {openNotes && (
          <div className="space-y-3">
            <form onSubmit={addNote} className="card p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">Title (optional)</label>
                  <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={notePublic}
                      onChange={(e) => setNotePublic(e.target.checked)}
                    />
                    Public
                  </label>
                </div>
              </div>
              <label className="block text-sm font-medium">Body</label>
              <textarea rows={4} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
              <div className="flex justify-end">
                <button className="btn" disabled={noteSubmitting || !noteBody.trim()}>
                  {noteSubmitting ? "Adding…" : "Add Note"}
                </button>
              </div>
            </form>

            {notes.length === 0 ? (
              <div className="opacity-70 text-sm">No notes yet.</div>
            ) : (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="card p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{asText(n.title) || "Untitled note"}</div>
                      <div className="text-xs opacity-60">
                        {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                      </div>
                    </div>
                    <div className="whitespace-pre-wrap">{asText(n.body)}</div>
                    <div className="flex items-center gap-2 text-xs opacity-70">
                      <span>{n.is_public ? "Public" : "Private"}</span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        className="btn btn-secondary"
                        onClick={() => updateNote(n.id, { is_public: !n.is_public })}
                      >
                        Make {n.is_public ? "Private" : "Public"}
                      </button>
                      <button className="btn btn-danger" onClick={() => deleteNote(n.id)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* ===== Conversation (collapsed by default) ===== */}
      <section className="space-y-3">
        <CollapseHeader open={openConversation} onToggle={() => setOpenConversation((o) => !o)}>
          Conversation
        </CollapseHeader>
        {openConversation && (
          <div className="space-y-2">
            <ConversationPanel
              userEmail={userEmail}
              headers={headers}
              resource={{ base: `/forge/problems/${id}` }}
              onResolved={(cid) => setConversationId(cid)}
              showInboxLink
              title="Conversation"
              height="h-[50vh]"
            />
          </div>
        )}
      </section>

      {/* ===== Danger zone (bottom-only delete) ===== */}
      {canDelete && (
        <section className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="text-xs opacity-70">Danger zone</div>
            <button
              className="btn btn-danger"
              onClick={async () => {
                if (!window.confirm(`Delete "${problem.title}"? This cannot be undone.`)) return;
                try {
                  await api.delete(`/forge/problems/${problem.id}`, { headers });
                  alert("Problem deleted.");
                  window.history.back();
                } catch (e) {
                  alert(e?.response?.data?.detail || "Failed to delete problem");
                }
              }}
            >
              Delete this problem
            </button>
          </div>
        </section>
      )}
    </main>
  );
}