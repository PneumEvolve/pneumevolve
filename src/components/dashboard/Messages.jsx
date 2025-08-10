// Messages.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

const API = import.meta.env.VITE_API_URL;

export default function Messages() {
  const { userEmail } = useAuth();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null); // conversation summary row
  const [thread, setThread] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState("");

  // Composer state
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);

  // Auto-scroll to bottom when thread changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  // Load conversation summaries
  useEffect(() => {
    if (!userEmail) return;
    let cancelled = false;
    setLoadingRows(true);
    setError("");

    axios
      .get(`${API}/conversations/summaries/${encodeURIComponent(userEmail)}`)
      .then((res) => {
        if (cancelled) return;
        setRows(Array.isArray(res.data) ? res.data : []);
      })
      .catch((e) => !cancelled && setError("Failed to load conversations."))
      .finally(() => !cancelled && setLoadingRows(false));

    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  // Load thread by conversation_id (works for System + DM)
  useEffect(() => {
    if (!selected?.conversation_id) return;
    let cancelled = false;
    setLoadingThread(true);

    axios
      .get(`${API}/conversations/${selected.conversation_id}/messages`)
      .then((res) => {
        if (cancelled) return;
        const msgs = Array.isArray(res.data) ? res.data : [];
        // normalize: prefer username/display if present
        setThread(
          msgs.map((m) => ({
            id: m.id,
            content: m.content,
            timestamp: m.timestamp,
            read: m.read,
            from_email: m.from_email,
            from_username: m.from_username,
            from_display: m.from_display || m.from_username || m.from_email || "User",
          }))
        );
      })
      .catch(() => !cancelled && setThread([]))
      .finally(() => !cancelled && setLoadingThread(false));

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const labelForRow = (r) =>
    r.other_display ||
    r.other_username ||
    r.other_email ||
    (r.conversation_name?.startsWith("system:") ? "System" : r.conversation_name || "Chat");

  const handleSend = async () => {
    const content = composer.trim();
    if (!content || !selected?.conversation_id || !userEmail) return;
    setSending(true);
    try {
      const res = await axios.post(
        `${API}/conversations/${selected.conversation_id}/send`,
        { sender_email: userEmail, content }
      );

      const sent = res?.data?.message;
      // Append or fallback construct
      const newMsg = sent
        ? {
            id: sent.id,
            content: sent.content,
            timestamp: sent.timestamp,
            read: sent.read,
            from_email: sent.from_email,
            from_username: sent.from_username,
            from_display: sent.from_display || sent.from_username || sent.from_email || "You",
          }
        : {
            id: Math.random(),
            content,
            timestamp: new Date().toISOString(),
            read: false,
            from_email: userEmail,
            from_username: null,
            from_display: "You",
          };

      setThread((prev) => [...prev, newMsg]);
      setComposer("");
    } catch (e) {
      console.error("Failed to send:", e);
    } finally {
      setSending(false);
    }
  };

  // Send on Enter, newline with Shift+Enter
  const onComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending) handleSend();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Left: conversation list */}
      <div className="md:col-span-1 border rounded p-2 h-[70vh] overflow-auto">
        <div className="font-semibold mb-2">Conversations</div>
        {loadingRows && <div className="text-sm opacity-60">Loading…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {rows.map((r) => {
          const label = labelForRow(r);
          return (
            <button
              key={r.conversation_id}
              onClick={() => {
                setSelected(r);
                setThread([]); // clear before load
              }}
              className={`w-full text-left p-2 rounded hover:bg-gray-100 flex items-center justify-between ${
                selected?.conversation_id === r.conversation_id ? "bg-gray-100" : ""
              }`}
              title={label}
            >
              <span className="truncate">{label}</span>
              {r.unread_count > 0 && (
                <span className="ml-2 text-xs bg-red-500 text-white px-2 rounded-full">
                  {r.unread_count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right: thread + composer */}
      <div className="md:col-span-2 border rounded p-2 h-[70vh] flex flex-col">
        {!selected ? (
          <div className="opacity-60">Select a conversation</div>
        ) : (
          <>
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {loadingThread && <div className="text-sm opacity-60">Loading thread…</div>}
              {thread.map((m) => (
                <div key={m.id} className="p-2 rounded border">
                  <div className="text-xs opacity-60">
                    {new Date(m.timestamp).toLocaleString()} — {m.from_display}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
              {!loadingThread && thread.length === 0 && (
                <div className="opacity-60">No messages yet.</div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="mt-2 border-t pt-2">
              <div className="text-xs opacity-70 mb-1">
                Sending to:{" "}
                {labelForRow(selected)}
              </div>
              <textarea
                className="w-full border rounded p-2 h-20"
                placeholder="Write a message… (Enter to send, Shift+Enter for newline)"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                onKeyDown={onComposerKeyDown}
                disabled={sending}
              />
              <div className="mt-2 flex justify-end">
                <button
                  className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
                  onClick={handleSend}
                  disabled={sending || !composer.trim()}
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}