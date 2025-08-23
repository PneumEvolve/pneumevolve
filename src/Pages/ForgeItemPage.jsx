// src/pages/ForgeItemPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { v4 as uuidv4 } from "uuid";
import ItemConversation from "@/components/ItemConversation";

const toLower = (s) => String(s || "").trim().toLowerCase();
const kindBadge = (k) => {
  const s = toLower(k);
  const base = "inline-flex items-center gap-1 px-2 py-1 rounded border text-xs";
  if (s === "idea") return `${base} border-emerald-500/40 text-emerald-700 dark:text-emerald-300`;
  if (s === "problem") return `${base} border-rose-500/40 text-rose-700 dark:text-rose-300`;
  return base;
};

export default function ForgeItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userEmail, accessToken } = useAuth();

  // anon identity for read/vote/pledge list
  const [anonId] = useState(() => {
    let v = localStorage.getItem("anon_id");
    if (!v) { v = uuidv4(); localStorage.setItem("anon_id", v); }
    return v;
  });
  const identityEmail = userEmail || `anon:${anonId}`;

  const headers = useMemo(() => {
    const h = { "x-user-email": identityEmail };
    if (accessToken) h.Authorization = `Bearer ${accessToken}`;
    return h;
  }, [identityEmail, accessToken]);

  // Item
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Pledges
  const [pledges, setPledges] = useState([]);
  const [pledgesErr, setPledgesErr] = useState("");
  const [loadingPledges, setLoadingPledges] = useState(true);
  const [pledgeText, setPledgeText] = useState("");
  const [addingPledge, setAddingPledge] = useState(false);
  const [marking, setMarking] = useState({}); // { [pledgeId]: boolean }

  // Danger zone
  const [deleting, setDeleting] = useState(false);

  // ---- fetches ----
  async function fetchItem() {
    setLoading(true); setErr("");
    try {
      const res = await api.get(`/forge/items/${id}`, { headers });
      setItem(res.data || null);
    } catch (e) {
      console.error("fetchItem failed", e);
      setErr(e?.response?.data?.detail || "Could not load this Forge item.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchPledges() {
    setLoadingPledges(true);
    setPledgesErr("");
    try {
      const res = await api.get(`/forge/items/${id}/pledges`, { headers });
      const arr = Array.isArray(res.data) ? res.data : [];
      setPledges(arr);
    } catch (e) {
      console.error("fetchPledges failed", e);
      setPledges([]);
      setPledgesErr(e?.response?.data?.detail || "Could not load pledges.");
    } finally {
      setLoadingPledges(false);
    }
  }

  useEffect(() => {
    fetchItem();
    fetchPledges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---- votes ----
  const hasVoted = !!item?.has_voted;
  const voteCount = item?.votes_count ?? 0;

  async function toggleVote() {
    if (!id) return;
    const before = item;
    const optimistic = {
      ...before,
      has_voted: !hasVoted,
      votes_count: Math.max(0, voteCount + (hasVoted ? -1 : 1)),
    };
    setItem(optimistic);
    try {
      const path = `/forge/items/${id}/vote`;
      if (hasVoted) await api.delete(path, { headers });
      else await api.post(path, {}, { headers });
      fetchItem();
    } catch (e) {
      console.error("vote failed", e);
      setItem(before);
      alert("Couldn’t register your vote.");
    }
  }

  // ---- pledges ----
  async function handleAddPledge(e) {
    e?.preventDefault?.();
    const text = pledgeText.trim();
    if (!userEmail) return alert("Please log in to add a pledge.");
    if (!text) return;

    setAddingPledge(true);
    try {
      await api.post(`/forge/items/${id}/pledges`, { text }, { headers });
      setPledgeText("");
      // Optimistic bump; fetch for truth
      setItem((prev) => prev ? { ...prev, pledges_count: (prev.pledges_count || 0) + 1 } : prev);
      await fetchPledges();
    } catch (e) {
      console.error("add pledge failed", e);
      alert(e?.response?.data?.detail || "Unable to add pledge.");
    } finally {
      setAddingPledge(false);
    }
  }

  async function markPledgeDone(pledgeId) {
    if (!userEmail) return;
    setMarking((m) => ({ ...m, [pledgeId]: true }));
    try {
      await api.patch(`/forge/pledges/${pledgeId}/done`, {}, { headers });
      // Optimistic update
      setPledges((prev) =>
        prev.map((p) => (p.id === pledgeId ? { ...p, done: true, done_at: new Date().toISOString() } : p))
      );
      setItem((prev) =>
        prev ? { ...prev, pledges_done: (prev.pledges_done || 0) + 1 } : prev
      );
    } catch (e) {
      console.error("mark done failed", e);
      alert(e?.response?.data?.detail || "Failed to mark pledge as done.");
    } finally {
      setMarking((m) => ({ ...m, [pledgeId]: false }));
    }
  }

  // ---- delete ----
  const canDelete =
    !!userEmail &&
    (!!item?.created_by_email &&
      userEmail.toLowerCase() === String(item.created_by_email).toLowerCase()
    || userEmail === "sheaklipper@gmail.com");

  async function handleDelete() {
    if (!canDelete) return;
    const title = item?.title ? `“${item.title}”` : "this item";
    if (!window.confirm(`Delete ${title}? This cannot be undone.`)) return;

    try {
      setDeleting(true);
      await api.delete(`/forge/items/${id}`, { headers });
      navigate("/forge");
    } catch (e) {
      console.error("delete failed", e);
      alert(e?.response?.data?.detail || "Failed to delete item.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <Link to="/forge2" className="btn btn-secondary">← Back to Forge</Link>
      </div>

      {loading ? (
        <div className="opacity-70">Loading…</div>
      ) : err ? (
        <div className="card border-amber-500/40">{err}</div>
      ) : !item ? (
        <div className="opacity-70">Not found.</div>
      ) : (
        <>
          {/* Header */}
          <header className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={kindBadge(item.kind)}>{String(item.kind).toUpperCase()}</span>
              {item.status && <span className="badge">Status: {item.status}</span>}
              {item.location && (
                <span className="badge bg-zinc-100 dark:bg-zinc-800">📍 {item.location}</span>
              )}
            </div>
            <h1 className="text-3xl font-bold leading-tight">{item.title}</h1>
            {item.created_at && (
              <div className="text-xs opacity-70">Posted {new Date(item.created_at).toLocaleString()}</div>
            )}
          </header>

          {/* Body */}
          {item.body && (
            <section className="card">
              <p className="whitespace-pre-wrap">{item.body}</p>
            </section>
          )}

          {/* Counters / actions */}
          <section className="flex flex-wrap items-center gap-3 justify-between">
            <div className="text-sm opacity-80 flex items-center gap-3">
              <span>👍 {voteCount} {voteCount === 1 ? "vote" : "votes"}</span>
              <span>•</span>
              <span>{item.pledges_done ?? 0}/{item.pledges_count ?? 0} pledges done</span>
              {item.domain && (<><span>•</span><span>Domain: {item.domain}</span></>)}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleVote}
                aria-pressed={hasVoted}
                className={hasVoted ? "btn btn-danger" : "btn btn-secondary"}
              >
                {hasVoted ? "🙅 Unvote" : "👍 Vote"}
              </button>
            </div>
          </section>

          {/* Pledges */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Pledges</h2>

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
                        {p.user_email ? `by ${p.user_email}` : "by someone"} •{" "}
                        {p.created_at ? new Date(p.created_at).toLocaleString() : ""}
                        {p.done && (
                          <>
                            {" "}<span>•</span>{" "}
                            <span className="inline-block px-2 py-0.5 rounded-full border text-[11px]">
                              Done {p.done_at ? `(${new Date(p.done_at).toLocaleString()})` : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Mark done (only mine & not already done) */}
                    {p.is_mine && !p.done && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => markPledgeDone(p.id)}
                        disabled={!!marking[p.id]}
                      >
                        {marking[p.id] ? "Marking…" : "Mark Done"}
                      </button>
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
          </section>

          {/* Conversation bound to this item */}
          {item.conversation_id ? (
            <section className="space-y-4">
              <ItemConversation itemId={item.id} userEmail={userEmail} />
            </section>
          ) : (
            <section className="card border-amber-500/30">
              Conversation unavailable for this item.
            </section>
          )}

          {/* Bottom danger zone */}
          {canDelete && (
            <section className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="text-xs opacity-70">Danger zone</div>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete this item"}
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}