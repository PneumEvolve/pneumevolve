import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function SolutionsSection({ problemId }) {
  const { userEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // identity
  const [anonId] = useState(() => {
    let v = localStorage.getItem("anon_id");
    if (!v) { v = uuidv4(); localStorage.setItem("anon_id", v); }
    return v;
  });
  const identityEmail = useMemo(() => userEmail || `anon:${anonId}`, [userEmail, anonId]);

  // state
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("trending");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const titleOk = title.trim().length >= 5;
  const descOk = description.trim().length >= 50;
  const canSubmit = titleOk && descOk && !!userEmail; // require login to propose

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/problems/${problemId}/solutions`, {
        params: { sort },
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

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [problemId, sort, identityEmail]);

  const submitSolution = async (e) => {
    e.preventDefault();
    if (!userEmail) {
      if (confirm("Log in to propose a solution?")) {
        navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      }
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await axios.post(`${API}/problems/${problemId}/solutions`, {
        title: title.trim(),
        description: description.trim(),
        anonymous: false,
      }, { headers: { "x-user-email": identityEmail } });
      setTitle(""); setDescription("");
      fetchList();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.detail || "Failed to submit solution.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVote = async (s) => {
    try {
      await axios.post(`${API}/solutions/${s.id}/vote`, {}, { headers: { "x-user-email": identityEmail } });
      fetchList();
    } catch (e) { console.error(e); }
  };

  const toggleFollow = async (s) => {
    if (!userEmail) {
      if (confirm("Log in to follow solutions and get updates?")) {
        navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      }
      return;
    }
    try {
      await axios.post(`${API}/solutions/${s.id}/follow`, {}, { headers: { "x-user-email": identityEmail } });
      fetchList();
    } catch (e) {
      console.error(e);
      if (e?.response?.status === 401) {
        if (confirm("Log in to follow solutions and get updates?")) {
          navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="section-bar flex items-center justify-between">
        <div className="font-semibold">Solutions</div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-sm">
          <option value="trending">Trending</option>
          <option value="votes">Votes</option>
          <option value="new">Newest</option>
        </select>
      </div>

      {/* Propose form */}
      <div className="card">
        {!userEmail && (
          <div className="mb-2 text-xs opacity-70">
            Log in to propose a solution.
          </div>
        )}
        <form onSubmit={submitSolution} className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Solution title"
            minLength={5}
          />
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain exactly what to do and how it addresses the problem…"
            minLength={50}
          />
          <div className="flex justify-end">
            <button className="btn" type="submit" disabled={!canSubmit || submitting}>
              {submitting ? "Submitting…" : "Propose Solution"}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      {loading ? (
        <div className="opacity-60">Loading solutions…</div>
      ) : list.length === 0 ? (
        <div className="opacity-60">No solutions yet. Be the first!</div>
      ) : (
        <div className="space-y-3">
          {list.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold">{s.title}</div>
                    {s.status === "Accepted" && <span className="badge">Accepted</span>}
                  </div>
                  <div className="text-xs opacity-70">Votes: {s.votes_count ?? 0} · Followers: {s.followers_count ?? 0}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleVote(s)}
                    className={s.has_voted ? "btn btn-danger" : "btn btn-secondary"}
                    title={s.has_voted ? "Unvote" : "Vote"}
                  >
                    {s.has_voted ? "🙅 Unvote" : "👍 Vote"}
                  </button>
                  <button
                    onClick={() => toggleFollow(s)}
                    className={s.is_following ? "btn btn-muted" : "btn btn-secondary"}
                    title={!userEmail ? "Log in to follow" : (s.is_following ? "Unfollow" : "Follow")}
                  >
                    {s.is_following ? "Following" : "Follow"}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm opacity-90 whitespace-pre-wrap">{s.description}</p>
              {/* (Later) Add Discuss button linking to a Solution detail page */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}