import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/context/AuthContext";
import SolutionsSection from "../components/SolutionsSection";

const API = import.meta.env.VITE_API_URL;

export default function ProblemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { userEmail } = useAuth();

  // one-time anon id for identity
  const [anonId] = useState(() => {
    let v = localStorage.getItem("anon_id");
    if (!v) {
      v = uuidv4();
      localStorage.setItem("anon_id", v);
    }
    return v;
  });
  const identityEmail = useMemo(
    () => userEmail || `anon:${anonId}`,
    [userEmail, anonId]
  );

  const [p, setP] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // load problem + its messages
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/problems/${id}`, {
        headers: { "x-user-email": identityEmail },
      });
      setP(res.data);
      if (res.data?.conversation_id) {
  const m = await axios.get(
    `${API}/conversations/${res.data.conversation_id}/messages`,
    { headers: { "x-user-email": identityEmail } }   // <-- add this
  );
  setMsgs(Array.isArray(m.data) ? m.data : []);
} else {
  setMsgs([]);
}
    } catch (e) {
      console.error(e);
      setError("Failed to load. Try refresh.");
      setP(null);
      setMsgs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, identityEmail]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // vote / follow (optimistic)
  const toggleVote = async () => {
    if (!p) return;
    const before = p;
    const was = !!p.has_voted;
    const next = {
      ...p,
      has_voted: !was,
      votes_count: Math.max(0, (p.votes_count || 0) + (was ? -1 : 1)),
    };
    setP(next);
    try {
      await axios.post(
        `${API}/problems/${p.id}/vote`,
        {},
        { headers: { "x-user-email": identityEmail } }
      );
    } catch (e) {
      console.error(e);
      setP(before);
    }
  };

  const toggleFollow = async () => {
    if (!p) return;
    if (!userEmail) {
      if (confirm("Log in to follow this problem and get updates?")) {
        navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      }
      return;
    }
    const before = p;
    const was = !!p.is_following;
    const next = {
      ...p,
      is_following: !was,
      followers_count: Math.max(0, (p.followers_count || 0) + (was ? -1 : 1)),
    };
    setP(next);
    try {
      await axios.post(
        `${API}/problems/${p.id}/follow`,
        {},
        { headers: { "x-user-email": identityEmail } }
      );
    } catch (e) {
  console.error(e);
  if (e?.response?.status === 401) {
    if (confirm("Log in to follow this problem and get updates?")) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
    }
  } else {
    setP(before);
  }
}
  }

  // messaging
  const send = async () => {
    const body = text.trim();
    if (!body || !p?.conversation_id || !userEmail) return;
    setSending(true);
    try {
      const res = await axios.post(
        `${API}/conversations/${p.conversation_id}/send`,
        {
          sender_email: userEmail, // only logged-in appears named
          content: body,
        }
      );
      const sent =
        res.data?.message || {
          id: Math.random(),
          timestamp: new Date().toISOString(),
          content: body,
          from_display: "You",
        };
      setMsgs((arr) => [...arr, sent]);
      setText("");
    } catch (e) {
      console.error(e);
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  // Never show emails; prefer display -> username -> "User <id>" -> "User"
  const formatSender = (m) => {
  const label =
    m.from_display ??
    m.from_username ??
    (typeof m.from_user_id === "number" ? `User ${m.from_user_id}` : "User");

  // Belt-and-suspenders: scrub anything that looks like an email
  return /\S+@\S+\.\S+/.test(label)
    ? (typeof m.from_user_id === "number" ? `User ${m.from_user_id}` : "User")
    : label;
};

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="main">
        <div className="card">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-3/5 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-24 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="main">
        <div className="card">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">Not found</div>
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>
              ← Back
            </button>
          </div>
          {error && (
            <div className="mt-3 text-sm opacity-80">
              {error} <button className="link-default" onClick={load}>Refresh</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="main space-y-6">
      {/* Top bar */}
      <div className="section-bar flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/problems")}
          >
            ← Back to Problems
          </button>
          <button className="btn btn-secondary" onClick={load} title="Refresh">
            ⟳ Refresh
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleVote}
            className={p.has_voted ? "btn btn-danger" : "btn btn-secondary"}
            title={p.has_voted ? "Unvote" : "Vote"}
          >
            {p.has_voted ? "🙅 Unvote" : "👍 Vote"} · {p.votes_count ?? 0}
          </button>
          <button
            onClick={toggleFollow}
            className={p.is_following ? "btn" : "btn btn-secondary"}
            title={!userEmail ? "Log in to follow" : (p.is_following ? "Unfollow" : "Follow")}
          >
            {p.is_following ? "Following" : "Follow"} · {p.followers_count ?? 0}
          </button>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Problem summary */}
        <div className="card space-y-3">
          
          <h1 className="text-3xl font-bold">{p.title}</h1>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="badge">Status: {p.status}</span>
            {p.scope && <span className="badge">Scope: {p.scope}</span>}
            {typeof p.severity === "number" && (
              <span className="badge">Severity: {p.severity}</span>
            )}
          </div>

          <p className="opacity-90 whitespace-pre-wrap">{p.description}</p>
        </div>

        {/* Conversation */}
        <div className="card flex flex-col h-[70vh]">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Conversation</div>
            {!userEmail && (
              <div className="text-xs opacity-70">Log in to participate</div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto space-y-2 pr-1">
            {msgs.map((m) => (
              <div
                key={m.id}
                className="p-2 rounded border"
                style={{
                  borderColor: "var(--border)",
                  background:
                    "color-mix(in oklab, var(--bg-elev) 94%, transparent)",
                }}
              >
                <div className="text-xs opacity-60 mb-1">
                  {m.timestamp ? new Date(m.timestamp).toLocaleString() : ""} —{" "}
                  {formatSender(m)}
                </div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="mt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="pt-3">
              <textarea
  ref={inputRef}                          // <-- attach ref
  className="w-full h-24"
  placeholder={userEmail
    ? "Write a message… (Enter to send, Shift+Enter for newline)"
    : "Log in to participate in the conversation"}
  disabled={!userEmail || sending}
  value={text}
  onChange={(e) => setText(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
      e.preventDefault();
      send();
    }
  }}
/>
              <div className="mt-2 flex justify-end">
                <button
                  onClick={send}
                  disabled={!userEmail || !text.trim() || sending}
                  className="btn"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
        <SolutionsSection problemId={p.id} />
      </div>

      {error && (
        <div className="text-sm opacity-80">
          {error} <button className="link-default" onClick={load}>Refresh</button>
        </div>
      )}
    </div>
  );
}