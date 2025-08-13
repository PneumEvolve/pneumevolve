// src/pages/Forge.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

const API = import.meta.env.VITE_API_URL;

// Canonical status order (match whatever you use in backend)
const STATUS_ORDER = ["Proposed", "Brainstorming", "Working", "Complete"];
const statusIndex = (s) => {
  const i = STATUS_ORDER.findIndex(
    (x) => String(x).toLowerCase() === String(s || "").toLowerCase()
  );
  return i === -1 ? STATUS_ORDER.length : i; // unknown -> last
};

const norm = (s) => String(s || "").trim().toLowerCase();

export default function Forge() {
  const { userEmail, accessToken } = useAuth();
  const navigate = useNavigate();

  // Data
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  // New idea form
  const [newIdea, setNewIdea] = useState({ title: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false); // ⬅️ starts collapsed

  // Controls
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState(() => localStorage.getItem("forge:sort") || "date");
  const [filterKey, setFilterKey] = useState(() => localStorage.getItem("forge:filter") || "all");
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem("forge:status") || "any");

  // Identity header support (for anon votes)
  const [anonId] = useState(() => {
    let id = localStorage.getItem("anon_id");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("anon_id", id);
    }
    return id;
  });
  const identityEmail = userEmail || `anon:${anonId}`;

  // Fetch + normalize
  const fetchIdeas = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/forge/ideas`, {
        params: { limit: 100 },
        headers: { "x-user-email": identityEmail },
      });
      const raw = Array.isArray(res.data) ? res.data : [];

      const normalized = raw.map((i) => {
        const creator_email =
          (i.user_email || i.creator_email || i.owner_email || "").trim().toLowerCase();

        const workers = Array.isArray(i.workers)
  ? i.workers.map((w) => ({
      id: w?.id ?? w?.user_id ?? w?.user?.id ?? null,        // ⬅️ capture id if present
      username: w?.username || w?.user?.username || "",
      // keep email ONLY for internal logic like "I'm working" – never render it
      email: norm(w?.email || w?.user_email || w?.user?.email),
    }))
  : [];

        return {
          id: i.id,
          title: i.title || "",
          description: i.description || "",
          status: i.status || "Proposed",
          created_at: i.created_at || null,
          creator_email,
          workers,
          votes_count:
            typeof i.votes_count === "number"
              ? i.votes_count
              : Array.isArray(i.votes)
              ? i.votes.length
              : 0,
          has_voted: Boolean(i.has_voted),
        };
      });

      // default newest first
      normalized.sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );

      setIdeas(normalized);
    } catch (e) {
      console.error("Failed to load ideas", e);
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filters
  const me = norm(userEmail);

  const isMine = (idea) => !!userEmail && idea.creator_email === me;
  const isWorking = (idea) => !!userEmail && idea.workers.some((w) => w.email === me);

  const list = useMemo(() => {
    let out = [...ideas];

    // 1) Main pill filter
    const fk = filterKey === "following" ? "others" : filterKey; // legacy guard
    if (fk === "mine") out = out.filter(isMine);
    else if (fk === "working") out = out.filter(isWorking);
    else if (fk === "others") out = userEmail ? out.filter((i) => !isMine(i)) : out;

    // 2) Status filter
    if (statusFilter !== "any") {
      const t = norm(statusFilter);
      out = out.filter((i) => norm(i.status) === t);
    }

    // 3) Search
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }

    // 4) Sort
    if (sortBy === "title") {
      out.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "votes") {
      out.sort((a, b) => (b.votes_count || 0) - (a.votes_count || 0));
    } else if (sortBy === "status") {
      out.sort((a, b) => {
        const sa = statusIndex(a.status);
        const sb = statusIndex(b.status);
        if (sa !== sb) return sa - sb;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0); // newest inside group
      });
    } else {
      // date
      out.sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
    }

    return out;
  }, [ideas, filterKey, statusFilter, query, sortBy, userEmail]);

  // Persist control choices
  const onSortChange = (v) => {
    setSortBy(v);
    localStorage.setItem("forge:sort", v);
  };
  const onPill = (v) => {
    setFilterKey(v);
    localStorage.setItem("forge:filter", v);
  };
  const onStatusFilter = (v) => {
    setStatusFilter(v);
    localStorage.setItem("forge:status", v);
  };

  // Actions
  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = newIdea.title.trim();
    const description = newIdea.description.trim();
    if (!userEmail) {
      alert("Please log in to submit an idea.");
      return;
    }
    if (!title || !description) {
      alert("Please provide a title and description.");
      return;
    }
    try {
      setSubmitting(true);
      await axios.post(
        `${API}/forge/ideas`,
        { title, description },
        { headers: { "x-user-email": userEmail } }
      );
      setNewIdea({ title: "", description: "" });
      setShowSubmitForm(false); // collapse after submit
      fetchIdeas();
    } catch (e) {
      console.error("Create failed", e);
      alert("Failed to submit idea.");
    } finally {
      setSubmitting(false);
    }
  };

  const computeHasVoted = (idea) => {
    if (typeof idea.has_voted === "boolean") return idea.has_voted;
    return false;
  };

  const toggleVote = async (id) => {
    const idx = ideas.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const before = ideas[idx];
    const was = computeHasVoted(before);

    // optimistic
    const next = { ...before };
    next.has_voted = !was;
    next.votes_count = Math.max(0, (before.votes_count || 0) + (was ? -1 : 1));
    setIdeas((arr) => {
      const copy = [...arr];
      copy[idx] = next;
      return copy;
    });

    try {
      const headers = { "x-user-email": identityEmail };
      if (userEmail) headers.Authorization = `Bearer ${accessToken}`;
      await axios.post(`${API}/forge/ideas/${id}/vote`, {}, { headers });
      fetchIdeas();
    } catch (e) {
      console.error("Vote failed", e);
      setIdeas((arr) => {
        const copy = [...arr];
        copy[idx] = before;
        return copy;
      });
      alert("Error voting.");
    }
  };

  const join = async (id) => {
    if (!userEmail) return alert("Please log in to join.");
    try {
      await axios.post(
        `${API}/forge/ideas/${id}/join`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}`, "x-user-email": userEmail } }
      );
      fetchIdeas();
    } catch (e) {
      console.error("Join failed", e);
      alert("Unable to join.");
    }
  };

  const quit = async (id) => {
    try {
      await axios.post(
        `${API}/forge/ideas/${id}/remove-worker`,
        {},
        { headers: { "x-user-email": userEmail } }
      );
      fetchIdeas();
    } catch (e) {
      console.error("Quit failed", e);
      alert("Unable to quit.");
    }
  };

  const handleViewNotes = (id) => navigate(`/forge/${id}`);

  // Pills (keeps your fixed contrast)
  const Pill = ({ value, label, disabled }) => {
    const isActive = filterKey === value;
    return (
      <button
        type="button"
        onClick={() => !disabled && onPill(value)}
        aria-pressed={isActive}
        disabled={disabled}
        className={[
          "px-3 py-1.5 rounded text-sm transition-colors border focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          isActive
            ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-600/90"
            : "bg-white dark:bg-transparent text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">🛠️ The Forge</h1>
          <p className="opacity-80">Vote, join, and track progress together.</p>
        </div>

        {/* Search (own bar) */}
        <div className="section-bar">
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ideas…"
              aria-label="Search ideas"
              className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="btn btn-secondary">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Sort + Status + Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-70">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="min-w-[11rem]"
            >
              <option value="date">Date Created</option>
              <option value="title">Title (A–Z)</option>
              <option value="votes">Votes</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm opacity-70">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilter(e.target.value)}
              className="min-w-[11rem]"
              aria-label="Filter by status"
            >
              <option value="any">Any</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Pill value="all" label="All" />
            <Pill value="mine" label="My ideas" disabled={!userEmail} />
            <Pill value="working" label="I’m working" disabled={!userEmail} />
            <Pill value="others" label="Others" />
          </div>
        </div>

        {/* Share an Idea (collapsible, starts closed) */}
        {userEmail && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowSubmitForm((s) => !s)}
              className="w-full btn btn-muted flex items-center justify-between"
              aria-expanded={showSubmitForm}
            >
              <span className="font-medium">
                {showSubmitForm ? "Hide Idea Form" : "Share an Idea"}
              </span>
              <span className="text-2xl leading-none select-none">
                {showSubmitForm ? "−" : "+"}
              </span>
            </button>

            {showSubmitForm && (
              <form onSubmit={handleSubmit} className="card space-y-3">
                <div className="font-semibold">New Idea</div>
                <input
                  type="text"
                  placeholder="Feature title…"
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                />
                <textarea
                  rows={4}
                  placeholder="Describe the idea…"
                  value={newIdea.description}
                  onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                />
                <div className="flex justify-end">
                  <button type="submit" className="btn" disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit Idea"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="opacity-70">Loading…</div>
        ) : list.length === 0 ? (
          <div className="opacity-70 text-center">Nothing here yet.</div>
        ) : (
          <div className="space-y-6">
            {list.map((idea) => {
              const iAmWorker = userEmail && idea.workers.some((w) => w.email === me);
              const iAmCreator = userEmail && idea.creator_email === me;
              const hasVoted = idea.has_voted;
              const count = idea.votes_count || 0;

              return (
                <div key={idea.id} className="card border-l-4 border-emerald-500 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-2xl font-semibold">{idea.title}</h2>
                    <span className="badge">Status: {idea.status}</span>
                  </div>

                  <p className="opacity-90">{idea.description}</p>

                  {/* Workers row (chips) */}
                  {idea.workers?.length > 0 && (
  <div className="flex items-center gap-2 text-sm flex-wrap">
    <span className="opacity-70">Workers:</span>
    {idea.workers.map((w, idx) => (
      <span
        key={idx}
        className="px-2.5 py-1 rounded-full border border-zinc-300 dark:border-zinc-700"
      >
        {w.username || (w.id ? `User ${w.id}` : "Contributor")}
      </span>
    ))}
  </div>
)}

                  <div className="flex flex-wrap gap-3 justify-end items-center">
                    <button
                      onClick={() => toggleVote(idea.id)}
                      aria-pressed={hasVoted}
                      className={hasVoted ? "btn btn-danger" : "btn btn-secondary"}
                    >
                      {hasVoted ? "🙅 Unvote" : "👍 Vote"} · {count}
                    </button>

                    <button onClick={() => handleViewNotes(idea.id)} className="btn">
                      {iAmCreator ? "Edit / View Notes" : "View Notes"}
                    </button>

                    {!iAmWorker && userEmail && (
                      <button onClick={() => join(idea.id)} className="btn">
                        Help
                      </button>
                    )}
                    {iAmWorker && userEmail && (
                      <button onClick={() => quit(idea.id)} className="btn btn-danger">
                        Quit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}