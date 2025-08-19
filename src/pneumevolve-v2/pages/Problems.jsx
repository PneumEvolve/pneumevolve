import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function Problems() {
  const { userEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
  const [newScope, setNewScope] = useState("Systemic"); // <-- new, independent of the list filter

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
      const res = await api.get(`/problems`, {
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
        const res = await api.get(`/problems`, { params: { near: t, limit: 5 } });
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

    const isAnon = identityEmail.startsWith("anon:");

    try {
      const res = await api.post(
        `/problems`,
        {
          title: t,
          description: d,
          severity: Number(severity) || 3,
          scope: newScope || "Systemic",
          anonymous: isAnon || anonymous,
        },
        {
          headers: {
            "x-user-email": identityEmail,
            "X-User-Email": identityEmail,
            "x_user_email": identityEmail,
          },
        }
      );
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
      await api.post(`/problems/${p.id}/vote`, {}, { headers: { "x-user-email": identityEmail } });
      fetchList();
    } catch {/* ignore */}
  };

  const toggleFollow = async (p) => {
  if (!p) return;

  // Not logged in? Prompt and bounce to login, preserving return URL
  if (!userEmail) {
    if (confirm("Log in to follow problems and get updates?")) {
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    }
    return;
  }

  try {
    await api.post(
      `/problems/${p.id}/follow`,
      {},
      { headers: { "x-user-email": identityEmail } }
    );
    fetchList();
  } catch (e) {
    console.error(e);
    if (e?.response?.status === 401) {
      if (confirm("Log in to follow problems and get updates?")) {
        navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      }
    }
  }
};

  const canDelete = (p) =>
    !!userEmail && (userEmail === p.created_by_email || userEmail === "sheaklipper@gmail.com");

  const handleDelete = async (p) => {
    if (!canDelete(p)) return;
    if (!confirm(`Delete “${p.title}”? This cannot be undone.`)) return;
    try {
      await api.delete(`/problems/${p.id}`, { headers: { "x-user-email": identityEmail } });
      fetchList();
    } catch (e) {
      console.error(e);
      alert("Failed to delete problem.");
    }
  };

  return (
    <div className="main space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold">🧭 Problems</h1>
        <p className="text-sm opacity-70">
          Post problems. Upvote “I have this too”. Follow to join the conversation.
        </p>
      </header>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search problems…"
          className="w-full sm:w-1/2"
        />
        <div className="flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
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
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="">All scope</option>
            <option>Personal</option>
            <option>Community</option>
            <option>Systemic</option>
          </select>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); localStorage.setItem("problems:sort", e.target.value); }}
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
          className="w-full btn btn-muted flex items-center justify-between"
        >
          <span className="font-medium">{openSubmit ? "Hide form" : "Share a problem"}</span>
          <span className="text-2xl">{openSubmit ? "−" : "+"}</span>
        </button>

        {openSubmit && (
          <form onSubmit={submitProblem} className="mt-3 space-y-3 card" noValidate>
            <div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="One-line problem statement"
                minLength={5}
                required
              />
              {!titleOk && title.length > 0 && (
                <p className="text-xs" style={{ color: "#dc2626", marginTop: 4 }}>
                  Title must be at least 5 characters.
                </p>
              )}
            </div>

            <div>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the problem: where it shows up, who it affects, context…"
                minLength={20}
                required
              />
              {!descOk && description.length > 0 && (
                <p className="text-xs" style={{ color: "#dc2626", marginTop: 4 }}>
                  Description must be at least 20 characters.
                </p>
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
                  style={{ width: 70 }}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span>Anonymous</span>
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              </label>
              <label className="flex items-center gap-2 text-sm">
    <span>Scope</span>
    <select value={newScope} onChange={(e) => setNewScope(e.target.value)}>
      <option>Personal</option>
      <option>Community</option>
      <option>Systemic</option>
    </select>
  </label>
            </div>

            {!!dupes.length && (
              <div className="p-3 rounded border" style={{ borderColor: "var(--border)" }}>
                <div className="font-medium mb-1">Possible duplicates</div>
                <ul className="list-disc ml-5 space-y-1">
                  {dupes.map((d) => (
                    <li key={d.id}>
                      <button type="button" className="underline" onClick={() => navigate(`/problems/${d.id}`)}>
                        {d.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button
                className="btn"
                type="submit"
                disabled={!canSubmit}
                title={!canSubmit ? "Add a longer title and description to submit" : "Submit"}
                style={!canSubmit ? { opacity: .6, cursor: "not-allowed" } : {}}
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
            <div
              key={p.id}
              className="card border-l-4"
              style={{ borderLeftColor: "var(--accent)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <button className="text-xl font-semibold hover:underline" onClick={() => navigate(`/problems/${p.id}`)}>
                    {p.title}
                  </button>
                  <div className="text-xs opacity-75 mt-1">
                    Status: {p.status} · Severity: {p.severity ?? 0} · Votes: {p.votes_count ?? 0} · Followers: {p.followers_count ?? 0}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleVote(p)}
                    className={p.has_voted ? "btn btn-danger" : "btn btn-secondary"}
                    title={p.has_voted ? "Unvote" : "Vote"}
                  >
                    {p.has_voted ? "🙅 Unvote" : "👍 Vote"}
                  </button>

                  <button
  onClick={() => toggleFollow(p)}
  className={p.is_following ? "btn btn-muted" : "btn btn-secondary"}
  title={!userEmail ? "Log in to follow" : (p.is_following ? "Unfollow" : "Follow")}
>
  {p.is_following ? "Following" : "Follow"}
</button>

                  {canDelete(p) && (
                    <button onClick={() => handleDelete(p)} className="btn btn-danger" title="Delete problem">
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-2 text-sm opacity-90">{p.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}