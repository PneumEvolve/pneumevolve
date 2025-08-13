// Inbox.jsx — Messages UI with live unread updates
import React, { useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export default function Inbox({ userEmail: userEmailProp, userId, setUnreadCount }) {
  // Prefer userEmail prop; fall back to userId if it's an email in your app
  const userEmail = useMemo(() => userEmailProp || userId || "", [userEmailProp, userId]);

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

  // --- helpers ---
  const broadcastUnread = (count) => {
    if (typeof setUnreadCount === "function") setUnreadCount(count);
    localStorage.setItem("unreadCount", String(count));
    window.dispatchEvent(new CustomEvent("inbox:unreadUpdate", { detail: { count } }));
  };

  const computeTotalUnread = (summaries) =>
    summaries.reduce((acc, r) => acc + (r.unread_count || 0), 0);

  const refreshSummaries = async () => {
    if (!userEmail) return;
    const res = await axios.get(`${API}/conversations/summaries/${encodeURIComponent(userEmail)}`);
    const data = Array.isArray(res.data) ? res.data : [];
    setRows(data);
    broadcastUnread(computeTotalUnread(data));
  };

  // Auto-scroll to bottom when thread changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  // Fetch conversation summaries (System + DMs)
  useEffect(() => {
    if (!userEmail) return;
    let cancelled = false;

    (async () => {
      try {
        setLoadingRows(true);
        await refreshSummaries();
      } catch {
        if (!cancelled) setError("Failed to load conversations.");
      } finally {
        if (!cancelled) setLoadingRows(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  // Load thread by conversation_id (works for System + DM)
  useEffect(() => {
    if (!selected?.conversation_id) return;
    let cancelled = false;

    (async () => {
      try {
        setLoadingThread(true);
        const res = await axios.get(`${API}/conversations/${selected.conversation_id}/messages`);
        if (cancelled) return;

        const msgs = Array.isArray(res.data) ? res.data : [];
        const normalized = msgs.map((m) => ({
          id: m.id,
          content: m.content,
          timestamp: m.timestamp,
          read: m.read,
          from_email: m.from_email,
          from_username: m.from_username,
          from_display: m.from_display || m.from_username || m.from_email || "User",
        }));
        setThread(normalized);

        // Mark any unread in this convo as read, then refresh summaries → updates badge + left list
        const unreadIds = normalized.filter((m) => !m.read).map((m) => m.id);
        if (unreadIds.length > 0) {
          try {
            await Promise.all(unreadIds.map((id) => axios.post(`${API}/inbox/read/${id}`)));

            // Optimistically mark read in the open thread
            setThread((prev) => prev.map((m) => (unreadIds.includes(m.id) ? { ...m, read: true } : m)));

            // Immediately zero out unread for this convo in the left list (before refetch)
            setRows((prev) =>
              prev.map((r) =>
                r.conversation_id === selected.conversation_id ? { ...r, unread_count: 0 } : r
              )
            );

            // Now refetch summaries to get the true totals and broadcast
            await refreshSummaries();
          } catch {
            // ignore; will correct on next refresh
          }
        }
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const labelForRow = (r) =>
    r.idea_title ||
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

      // Move this convo to the top with updated preview
      setRows((prev) => {
        const next = [...prev];
        const idx = next.findIndex((r) => r.conversation_id === selected.conversation_id);
        if (idx !== -1) {
          next[idx] = {
            ...next[idx],
            last_content: newMsg.content,
            last_timestamp: newMsg.timestamp,
          };
          next.sort((a, b) => new Date(b.last_timestamp) - new Date(a.last_timestamp));
        }
        return next;
      });
    } catch (e) {
      console.error("Failed to send:", e);
    } finally {
      setSending(false);
    }
  };

  const handleLeave = async () => {
  if (!selected?.conversation_id || !userEmail) return;

  try {
    const name = selected.conversation_name || "";

    // Idea conversations → reuse existing unfollow route
    if (name.startsWith("idea:")) {
      const ideaId = parseInt(name.split(":")[1], 10);
      if (!Number.isNaN(ideaId)) {
        await axios.post(
          `${API}/ideas/${ideaId}/conversation/unfollow`,
          null,
          { params: { user_email: userEmail } }
        );
      }
    }
    // System conversation → don’t allow leaving
    else if (name.startsWith("system:")) {
      alert("You can’t remove your System conversation. You can mark messages read.");
      return;
    }
    // Everything else (DMs, feedback, etc.) → generic leave
    else {
      await axios.post(
        `${API}/conversations/${selected.conversation_id}/leave`,
        { user_email: userEmail }
      );
    }

    // Remove from UI
    setRows((prev) => prev.filter((r) => r.conversation_id !== selected.conversation_id));
    setSelected(null);
    setThread([]);
    await refreshSummaries();
  } catch (e) {
    console.error("Leave failed:", e);
    alert("Failed to leave conversation.");
  }
};

// Optional: admin delete for everyone
const handleAdminDelete = async () => {
  if (!selected?.conversation_id || userEmail !== "sheaklipper@gmail.com") return;
  if (!window.confirm("Delete this conversation for everyone? This cannot be undone.")) return;

  try {
    await axios.delete(`${API}/conversations/${selected.conversation_id}`, {
      params: { user_email: userEmail },
    });
    setRows((prev) => prev.filter((r) => r.conversation_id !== selected.conversation_id));
    setSelected(null);
    setThread([]);
    await refreshSummaries();
  } catch (e) {
    console.error("Delete failed:", e);
    alert("Failed to delete conversation.");
  }
};

  // Send on Enter, newline with Shift+Enter
  const onComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending) handleSend();
    }
  };

  if (!userEmail) return <p className="text-gray-400 italic">No user email provided.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
     {/* Left: conversation list */}
<div className="md:col-span-1 border rounded p-2 h-[70vh] overflow-auto convo-list">
  <div className="font-semibold mb-2">Conversations</div>
  {loadingRows && <div className="text-sm opacity-60">Loading…</div>}
  {error && <div className="text-sm text-red-500 dark:text-red-400">{error}</div>}

  {rows.map((r) => {
    const label = labelForRow(r);
    const isSel = selected?.conversation_id === r.conversation_id;
    return (
      <button
        key={r.conversation_id}
        type="button"
        onClick={() => { setSelected(r); setThread([]); }}
        title={label}
        aria-selected={isSel}
        style={{ WebkitTapHighlightColor: "transparent" }} // iOS tap flash
        className={[
          "convo-row w-full text-left p-2 rounded flex items-center justify-between",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
          isSel ? "" : "", // bg is handled by CSS for hover/selected
        ].join(" ")}
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
          {/* Header / actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm opacity-70">
          {selected.idea_title || selected.other_display || selected.conversation_name || "Conversation"}
        </div>
        <div className="flex items-center gap-2">
          {/* Leave / Unfollow */}
          <button className="btn btn-secondary" onClick={handleLeave}>
            {selected.conversation_name?.startsWith("idea:") ? "Unfollow" : "Leave"}
          </button>

          {/* Admin nuke */}
          {userEmail === "sheaklipper@gmail.com" && (
            <button className="btn btn-danger" onClick={handleAdminDelete}>
              Delete for everyone
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
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
              <div className="text-xs opacity-70 mb-1">Sending to: {labelForRow(selected)}</div>
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