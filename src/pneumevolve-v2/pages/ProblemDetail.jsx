import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/context/AuthContext";

const API = import.meta.env.VITE_API_URL;

export default function ProblemDetail() {
  const { id } = useParams();
  const { userEmail } = useAuth();

  const [anonId] = useState(() => {
    let v = localStorage.getItem("anon_id");
    if (!v) { v = uuidv4(); localStorage.setItem("anon_id", v); }
    return v;
  });
  const identityEmail = useMemo(() => userEmail || `anon:${anonId}`, [userEmail, anonId]);

  const [p, setP] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/problems/${id}`, { headers: { "x-user-email": identityEmail } });
      setP(res.data);
      if (res.data?.conversation_id) {
        const m = await axios.get(`${API}/conversations/${res.data.conversation_id}/messages`);
        setMsgs(m.data || []);
      } else {
        setMsgs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const body = text.trim();
    if (!body || !p?.conversation_id) return;
    try {
      const res = await axios.post(`${API}/conversations/${p.conversation_id}/send`, {
        sender_email: userEmail || "", // only logged-in will appear named
        content: body,
      });
      const sent = res.data?.message || { id: Math.random(), timestamp: new Date().toISOString(), content: body, from_display: "You" };
      setMsgs((arr) => [...arr, sent]);
      setText("");
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="opacity-60">Loading…</div>;
  if (!p) return <div>Not found</div>;

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">{p.title}</h1>
        <div className="text-xs opacity-70">
          Status: {p.status} · Severity: {p.severity} · Votes: {p.votes_count} · Followers: {p.followers_count}
        </div>
        <p className="whitespace-pre-wrap">{p.description}</p>
      </div>

      {/* Conversation */}
      <div className="border rounded p-3 flex flex-col h-[70vh]">
        <div className="font-semibold mb-2">Conversation</div>
        <div className="flex-1 overflow-auto space-y-2">
          {msgs.map((m) => (
            <div key={m.id} className="p-2 rounded border">
              <div className="text-xs opacity-60">
                {m.timestamp ? new Date(m.timestamp).toLocaleString() : ""} — {m.from_display || m.from_username || m.from_email || "User"}
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="mt-2 border-t pt-2">
          <textarea
            className="w-full border rounded p-2 h-20"
            placeholder={userEmail ? "Write a message…" : "Log in to participate in the conversation"}
            disabled={!userEmail}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <div className="mt-2 flex justify-end">
            <button onClick={send} disabled={!userEmail || !text.trim()} className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}