import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import MessageModal from "../components/MessageModal";

const API = import.meta.env.VITE_API_URL;

/* ---------- Tiny toast system (no deps) ---------- */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = (text, type = "info", ms = 2500) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, ms);
  };
  return { toasts, add };
}

function Toasts({ toasts }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-3 py-2 rounded shadow text-sm text-white ${
            t.type === "error"
              ? "bg-red-600"
              : t.type === "success"
              ? "bg-emerald-600"
              : "bg-zinc-800"
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ---------- Skeletons ---------- */
function IdeaSkeleton() {
  return (
    <div className="p-6 rounded-xl shadow bg-white dark:bg-zinc-800 border-l-4 border-zinc-300 animate-pulse space-y-4">
      <div className="h-6 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded" />
      <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded" />
      <div className="h-4 w-4/5 bg-zinc-200 dark:bg-zinc-700 rounded" />
      <div className="flex justify-end gap-3">
        <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-700 rounded" />
        <div className="h-8 w-28 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
    </div>
  );
}

export default function Forge() {
  const [ideas, setIdeas] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [newIdea, setNewIdea] = useState({ title: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const { userEmail, accessToken } = useAuth();
  const navigate = useNavigate();
  const { toasts, add: toast } = useToasts();

  // Collapsible Submit Form
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  // Filters / search / sort
  const [sortCriteria, setSortCriteria] = useState(
    () => localStorage.getItem("forge:sort") || "date"
  );
  const [filterKey, setFilterKey] = useState(
    () => localStorage.getItem("forge:filter") || "all"
  );
  const [query, setQuery] = useState("");

  // DM modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");

  // Persistent anonymous UUID (one-time generate)
  const [anonId] = useState(() => {
    let id = localStorage.getItem("anon_id");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("anon_id", id);
    }
    return id;
  });

  // Unified identity: email if logged in; else anon:{uuid}
  const identityEmail = useMemo(
    () => userEmail || `anon:${anonId}`,
    [userEmail, anonId]
  );

  const handleOpenModal = (worker) => {
    const email = worker?.user?.email || worker?.email || "";
    if (!email) return;
    setRecipientEmail(email);
    setIsModalOpen(true);
  };

  const fetchIdeas = async () => {
    setLoadingList(true);
    try {
      // If backend annotates has_voted / is_following when it sees x-user-email:
      const res = await axios.get(`${API}/forge/ideas`, {
        headers: { "x-user-email": identityEmail },
      });
      setIdeas(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching ideas:", err);
      toast("Failed to load ideas.", "error");
      setIdeas([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSortChange = (e) => {
    const v = e.target.value;
    setSortCriteria(v);
    localStorage.setItem("forge:sort", v);
  };

  const handleFilterChange = (key) => {
    setFilterKey(key);
    localStorage.setItem("forge:filter", key);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = newIdea.title.trim();
    const description = newIdea.description.trim();
    if (!title || !description) {
      toast("Please provide a title and description.", "error");
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
      toast("Idea submitted. Thank you!", "success");
      fetchIdeas();
      // setShowSubmitForm(false);
    } catch (err) {
      console.error("Error creating idea:", err);
      toast("Error creating idea.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Helpers for filters
  const isMine = (idea) => !!userEmail && idea.user_email === userEmail;
  const isWorking = (idea) =>
    !!userEmail && idea.workers?.some((w) => w.email === userEmail);
  const isFollowingIdea = (idea) => {
    if (typeof idea.is_following === "boolean") return idea.is_following;
    if (Array.isArray(idea.followers)) {
      return idea.followers.some(
        (f) =>
          f.email === userEmail ||
          f.user_email === userEmail ||
          f.email === identityEmail ||
          f.user_email === identityEmail
      );
    }
    return false;
  };

  const sortedAndFilteredIdeas = useMemo(() => {
    let list = [...ideas];

    // Apply filter first
    if (filterKey === "mine") {
      list = list.filter(isMine);
    } else if (filterKey === "working") {
      list = list.filter(isWorking);
    } else if (filterKey === "following") {
      list = list.filter(isFollowingIdea);
    }

    // Then search
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      );
    }

    // Then sort
    if (sortCriteria === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortCriteria === "date") {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortCriteria === "votes") {
      list.sort(
        (a, b) =>
          (b.votes_count ?? b.votes?.length ?? 0) -
          (a.votes_count ?? a.votes?.length ?? 0)
      );
    }
    return list;
  }, [ideas, sortCriteria, filterKey, query, userEmail]);

  // hasVoted helper
  const computeHasVoted = (idea) =>
    idea.has_voted ??
    (idea.votes?.some((v) => v.user_email === identityEmail) ?? false);

  // Optimistic vote toggle
  const handleVote = async (id) => {
    const idx = ideas.findIndex((i) => i.id === id);
    if (idx === -1) return;

    const before = ideas[idx];
    const wasVoted = computeHasVoted(before);

    // Optimistic copy
    const next = { ...before };
    const currentCount = next.votes_count ?? next.votes?.length ?? 0;

    if (wasVoted) {
      next.has_voted = false;
      if (typeof next.votes_count === "number") {
        next.votes_count = Math.max(0, currentCount - 1);
      } else if (Array.isArray(next.votes)) {
        next.votes = next.votes.filter((v) => v.user_email !== identityEmail);
      }
    } else {
      next.has_voted = true;
      if (typeof next.votes_count === "number") {
        next.votes_count = currentCount + 1;
      } else if (Array.isArray(next.votes)) {
        next.votes = [...next.votes, { user_email: identityEmail }];
      }
    }

    // Commit optimistic change
    setIdeas((arr) => {
      const clone = [...arr];
      clone[idx] = next;
      return clone;
    });

    try {
      const headers = { "x-user-email": identityEmail };
      if (userEmail) headers.Authorization = `Bearer ${accessToken}`;
      await axios.post(`${API}/forge/ideas/${id}/vote`, {}, { headers });
      // Reconcile in background
      fetchIdeas();
    } catch (err) {
      // Rollback on error
      setIdeas((arr) => {
        const clone = [...arr];
        clone[idx] = before;
        return clone;
      });
      console.error("Error voting:", err);
      toast("Error voting. Please try again.", "error");
    }
  };

  const handleJoin = async (id) => {
    if (!userEmail) {
      toast("Please log in to join an idea.", "error");
      return;
    }
    const existing = ideas.find(
      (idea) => idea.id === id && idea.workers?.some((w) => w.email === userEmail)
    );
    if (existing) {
      toast("You have already joined this idea.", "info");
      return;
    }
    try {
      await axios.post(
        `${API}/forge/ideas/${id}/join`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}`, "x-user-email": userEmail } }
      );
      toast("You’ve joined this idea. The creator has been notified!", "success");
      fetchIdeas();
    } catch (err) {
      console.error("Error joining:", err);
      toast("You’ve already joined or need to log in.", "error");
    }
  };

  const handleRemoveWorker = async (id) => {
    try {
      await axios.post(
        `${API}/forge/ideas/${id}/remove-worker`,
        {},
        { headers: { "x-user-email": userEmail } }
      );
      toast("You have left the idea.", "success");
      fetchIdeas();
    } catch (err) {
      console.error("Error removing worker:", err);
      toast("There was an error removing you from the idea.", "error");
    }
  };

  const handleDelete = async (id) => {
    const idea = ideas.find((i) => i.id === id);
    if (userEmail === "sheaklipper@gmail.com" || idea?.user_email === userEmail) {
      try {
        await axios.delete(`${API}/forge/ideas/${id}`, {
          headers: { "x-user-email": userEmail },
        });
        toast("Idea deleted.", "success");
        fetchIdeas();
      } catch (err) {
        console.error("Error deleting idea:", err);
        toast("Error deleting idea.", "error");
      }
    } else {
      toast("You are not authorized to delete this idea.", "error");
    }
  };

  const handleViewNotes = (id) => navigate(`/forge/${id}`);

  // UI helpers
  const FilterButton = ({ value, label }) => (
    <button
      type="button"
      onClick={() => handleFilterChange(value)}
      aria-pressed={filterKey === value}
      className={`px-3 py-1.5 rounded text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        filterKey === value
          ? "bg-blue-600 text-white"
          : "hover:bg-gray-100 dark:hover:bg-zinc-700"
      }`}
      title={label}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">🛠️ The Forge</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Vote on what we build next. Join a feature as a worker. Chat in each idea’s thread.
          </p>
        </div>

        {/* Controls: search + sort + filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ideas…"
            className="w-full sm:w-1/2 p-2 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
            aria-label="Search ideas"
          />

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
            <div className="flex items-center gap-2">
              <label className="text-sm opacity-70">Sort by</label>
              <select
                value={sortCriteria}
                onChange={handleSortChange}
                className="p-2 border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800"
              >
                <option value="date">Date Created</option>
                <option value="title">Title (A-Z)</option>
                <option value="votes">Votes</option>
              </select>
            </div>

            <div className="flex items-center border rounded p-1 bg-white dark:bg-zinc-800">
              <FilterButton value="all" label="All" />
              <FilterButton value="mine" label="My ideas" />
              <FilterButton value="working" label="I’m working" />
              <FilterButton value="following" label="Following" />
            </div>
          </div>
        </div>

        {/* Collapsible "Submit Idea" */}
        {userEmail && (
          <div className="mb-2">
            <button
              type="button"
              onClick={() => setShowSubmitForm((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <input
                  type="text"
                  placeholder="Feature title…"
                  className="w-full p-3 rounded bg-gray-100 dark:bg-gray-800"
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                />
                <textarea
                  placeholder="Describe the idea briefly…"
                  rows={4}
                  className="w-full p-3 rounded bg-gray-100 dark:bg-gray-800"
                  value={newIdea.description}
                  onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {submitting ? "Submitting…" : "Submit Idea"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Idea List */}
        {loadingList ? (
          <div className="space-y-6 mt-6">
            <IdeaSkeleton />
            <IdeaSkeleton />
            <IdeaSkeleton />
          </div>
        ) : sortedAndFilteredIdeas.length === 0 ? (
          <div className="mt-10 text-center opacity-70">
            Nothing here. Try a different filter or share an idea!
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {sortedAndFilteredIdeas.map((idea) => {
              const isCreator =
                idea.user_email === userEmail || userEmail === "sheaklipper@gmail.com";
              const isWorker = idea.workers?.some((w) => w.email === userEmail);
              const hasVoted = computeHasVoted(idea);
              const count = idea.votes_count ?? idea.votes?.length ?? 0;

              return (
                <div
                  key={idea.id}
                  className="p-6 rounded-xl shadow-lg bg-white dark:bg-zinc-800 border-l-4 border-emerald-500 space-y-4"
                >
                  <h2 className="text-2xl font-semibold">{idea.title}</h2>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {idea.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-80">Status: {idea.status}</span>

                    {idea.workers && idea.workers.length > 0 && (
                      <div className="flex items-center gap-2 text-sm flex-wrap justify-end">
                        <span className="opacity-70">Workers:</span>
                        {idea.workers.map((worker, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleOpenModal(worker)}
                            title={`Message ${worker.username || worker.email || "worker"}`}
                            className="inline-flex items-center px-2.5 py-1 rounded-full
                                       bg-zinc-100 dark:bg-zinc-700
                                       text-zinc-900 dark:text-zinc-100
                                       border border-zinc-200/70 dark:border-zinc-600
                                       hover:bg-zinc-200 dark:hover:bg-zinc-600
                                       focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                       text-sm"
                          >
                            {worker.username || worker.email}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 justify-end items-center">
                    <div className="text-xs opacity-60 mr-auto">
                      {userEmail ? "Votes are linked to your account." : "Anonymous voting is allowed."}
                    </div>

                    {/* Vote toggle */}
                    <button
                      onClick={() => handleVote(idea.id)}
                      aria-pressed={hasVoted}
                      className={`px-3 py-2 rounded border focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        hasVoted
                          ? "bg-red-600 border-red-600 text-white"
                          : "bg-white dark:bg-zinc-800 border-emerald-600 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {hasVoted ? "🙅 Unvote" : "👍 Vote"} · {count}
                    </button>

                    {/* Notes */}
                    <button
                      onClick={() => handleViewNotes(idea.id)}
                      className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {isCreator ? "Edit / View Notes" : "View Notes"}
                    </button>

                    {/* Join / Quit */}
                    {!isWorker && userEmail && (
                      <button
                        onClick={() => handleJoin(idea.id)}
                        className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        Help
                      </button>
                    )}
                    {isWorker && userEmail && (
                      <button
                        onClick={() => handleRemoveWorker(idea.id)}
                        className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        Quit
                      </button>
                    )}

                    {/* Delete (creator/admin) */}
                    {isCreator && (
                      <button
                        onClick={() => handleDelete(idea.id)}
                        className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Modal */}
      <MessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        senderEmail={userEmail}
        recipientEmail={recipientEmail}
        onSent={() => {}}
      />

      <Toasts toasts={toasts} />
    </div>
  );
}