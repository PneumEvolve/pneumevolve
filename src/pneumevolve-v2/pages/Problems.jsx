import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function Problems() {
  const { userEmail } = useAuth();
  const navigate = useNavigate();

  // one-time anon id
  const [anonId] = useState(() => {
    let id = localStorage.getItem("anon_id");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("anon_id", id);
    }
    return id;
  });
  const identityEmail = useMemo(() => userEmail || `anon:${anonId}`, [userEmail, anonId]);

  // listing state
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(() => localStorage.getItem("problems:sort") || "trending");
  const [status, setStatus] = useState("");
  const [scope, setScope] = useState("");

  // submit state
  const [openSubmit, setOpenSubmit] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState(3);
  const [anonymous, setAnonymous] = useState(false);
  const [dupes, setDupes] = useState([]);

  // validation helpers
  const titleOk = title.trim().length >= 5;
  const descOk = description.trim().length >= 20;
  const canSubmit = titleOk && descOk;

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/problems`, {
        params: { q, status, scope, sort, limit: 100 },
        headers: { "x-user-email": identityEmail },
      });
      setList(res.data || []);
    } catch (e) {
      console.error(e);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, scope, sort]);

  // duplicate suggestions as user types title
  useEffect(() => {
    const t = title.trim();
    if (!t) { setDupes([]); return; }
    const id = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/problems`, { params: { near: t, limit: 5 } });
        setDupes(res.data || []);
      } catch {
        setDupes([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [title]);

  const submitProblem = async (e) => {
  e.preventDefault();

  const t = title.trim();
  const d = description.trim();
  if (t.length < 5 || d.length < 20) {
    alert("Please make the title ≥ 5 chars and the description ≥ 20 chars.");
    return;
  }

  // If user isn't logged in, we’ll send anon:{uuid} and mark anonymous=true
  const isAnon = identityEmail.startsWith("anon:");

  const payload = {
    title: t,
    description: d,
    severity: Number(severity) || 3,
    scope: scope || "Systemic",
    anonymous: isAnon || anonymous,
  };

  try {
    const res = await axios.post(
  `${API}/problems`,
  {
    title: t,
    description: d,
    severity: Number(severity) || 3,
    scope: scope || "Systemic",
    anonymous: isAnon || anonymous,
  },
  {
    headers: {
      // send a few variants to be bulletproof against backend differences
      "x-user-email": identityEmail,
      "X-User-Email": identityEmail,
      "x_user_email": identityEmail,
    },
  }
);
console.log("Submitting problem with identity:", identityEmail);

    setTitle("");
    setDescription("");
    setSeverity(3);
    setAnonymous(false);
    setOpenSubmit(false);

    const newId = res?.data?.id;
    if (newId) navigate(`/problems/${newId}`);
    else fetchList();
  } catch (err) {
    const detail =
      err?.response?.data?.detail ??
      (typeof err?.response?.data === "string"
        ? err.response.data
        : JSON.stringify(err?.response?.data)) ??
      err.message;
    console.error("POST /problems failed:", err?.response || err);
    alert(`Failed to submit problem: ${detail}`);
  }
};

  const toggleVote = async (p) => {
    try {
      await axios.post(`${API}/problems/${p.id}/vote`, {}, { headers: { "x-user-email": identityEmail } });
      fetchList();
    } catch {
      /* ignore */
    }
  };

  const toggleFollow = async (p) => {
    try {
      await axios.post(`${API}/problems/${p.id}/follow`, {}, { headers: { "x-user-email": identityEmail } });
      fetchList();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold">🧭 Problems</h1>
        <p className="text-sm opacity-70">Post problems. Upvote “I have this too”. Follow to join the conversation.</p>
      </header>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search problems…"
          className="w-full sm:w-1/2 p-2 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
        />
        <div className="flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="p-2 rounded border dark:bg-zinc-800">
            <option value="">All status</option>
            <option>Open</option>
            <option>Triaged</option>
            <option>In Discovery</option>
            <option>In Design</option>
            <option>In Experiment</option>
            <option>In Rollout</option>
            <option>Solved</option>
            <option>Archived</option>
          </select>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="p-2 rounded border dark:bg-zinc-800">
            <option value="">All scope</option>
            <option>Personal</option>
            <option>Community</option>
            <option>Systemic</option>
          </select>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); localStorage.setItem("problems:sort", e.target.value); }}
            className="p-2 rounded border dark:bg-zinc-800"
          >
            <option value="trending">Trending</option>
            <option value="votes">Votes</option>
            <option value="new">Newest</option>
          </select>
        </div>
      </div>

      {/* Submit (collapsible) */}
      <div>
        <button
          onClick={() => setOpenSubmit((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <span className="font-medium">{openSubmit ? "Hide form" : "Share a problem"}</span>
          <span className="text-2xl">{openSubmit ? "−" : "+"}</span>
        </button>

        {openSubmit && (
          <form onSubmit={submitProblem} className="mt-3 space-y-3" noValidate>
            <div>
              <input
                className="w-full p-3 rounded bg-gray-100 dark:bg-gray-800"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="One-line problem statement"
                minLength={5}
                required
              />
              {!titleOk && title.length > 0 && (
                <p className="text-xs text-red-600 mt-1">Title must be at least 5 characters.</p>
              )}
            </div>

            <div>
              <textarea
                className="w-full p-3 rounded bg-gray-100 dark:bg-gray-800"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the problem: where it shows up, who it affects, context…"
                minLength={20}
                required
              />
              {!descOk && description.length > 0 && (
                <p className="text-xs text-red-600 mt-1">Description must be at least 20 characters.</p>
              )}
            </div>

            <div className="flex gap-3 items-center">
              <label className="flex items-center gap-2 text-sm">
                <span>Severity</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  className="w-16 p-1 rounded border"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span>Anonymous</span>
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              </label>
            </div>

            {!!dupes.length && (
              <div className="p-3 rounded border text-sm">
                <div className="font-medium mb-1">Possible duplicates</div>
                <ul className="list-disc ml-5 space-y-1">
                  {dupes.map((d) => (
                    <li key={d.id}>
                      <button type="button" className="text-blue-600 underline" onClick={() => navigate(`/problems/${d.id}`)}>
                        {d.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button
                className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={!canSubmit}
                title={!canSubmit ? "Add a longer title and description to submit" : "Submit"}
              >
                Submit Problem
              </button>
            </div>
          </form>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : list.length === 0 ? (
        <div className="opacity-60">No problems found.</div>
      ) : (
        <div className="space-y-4">
          {list.map((p) => (
            <div key={p.id} className="p-4 rounded-xl shadow bg-white dark:bg-zinc-800 border-l-4 border-blue-400">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <button className="text-xl font-semibold text-left hover:underline" onClick={() => navigate(`/problems/${p.id}`)}>
                    {p.title}
                  </button>
                  <div className="text-xs opacity-70 mt-1">
                    Status: {p.status} · Severity: {p.severity ?? 0} · Votes: {p.votes_count ?? 0} · Followers: {p.followers_count ?? 0}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleVote(p)}
                    className={`px-3 py-1 rounded border ${
                      p.has_voted ? "bg-red-600 text-white border-red-600" : "bg-white dark:bg-zinc-800 border-emerald-600 text-emerald-700"
                    }`}
                  >
                    {p.has_voted ? "Unvote" : "Vote"}
                  </button>
                  <button
                    onClick={() => toggleFollow(p)}
                    className={`px-3 py-1 rounded border ${
                      p.is_following ? "bg-zinc-900 text-white border-zinc-900" : "bg-white dark:bg-zinc-800 border-zinc-600"
                    }`}
                  >
                    {p.is_following ? "Following" : "Follow"}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm opacity-90 line-clamp-3">{p.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}