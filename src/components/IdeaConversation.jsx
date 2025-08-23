// src/components/IdeaConversation.jsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * Props:
 * - conversationId?: number  // NEW preferred path (Forge items)
 * - ideaId?: number          // legacy ideas path (kept for compatibility)
 * - userEmail?: string
 * - isFollowing?: boolean    // when using conversationId mode
 * - onToggleFollow?: () => Promise<void> | void
 * - title?: string           // optional header label override
 */
export default function IdeaConversation({
  conversationId,
  ideaId,
  userEmail,
  isFollowing,
  onToggleFollow,
  title = "Conversation",
}) {
  const [resolvedConvoId, setResolvedConvoId] = useState(conversationId ?? null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState("");
  const [error, setError] = useState("");

  // legacy follow state (idea mode)
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const listRef = useRef(null);
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Resolve conversation + load messages
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError("");

        // MODE A: conversationId → use global routes
        if (conversationId) {
          setResolvedConvoId(conversationId);
          const res = await api.get(`/conversations/${conversationId}/messages`);
          if (cancelled) return;
          setMessages(Array.isArray(res.data) ? res.data : []);
          // follow state comes from parent in this mode
        }
        // MODE B: ideaId → legacy routes you already use
        else if (ideaId) {
          // fetch conversation id
          const idRes = await api.get(`/ideas/${ideaId}/conversation`);
          if (cancelled) return;
          const cid = idRes?.data?.conversation_id || null;
          setResolvedConvoId(cid);

          // load messages
          const msgRes = await api.get(`/ideas/${ideaId}/conversation/messages`);
          if (cancelled) return;
          setMessages(Array.isArray(msgRes.data) ? msgRes.data : []);

          // follow flag if signed in
          if (userEmail) {
            const fRes = await api.get(`/ideas/${ideaId}/conversation/following`, {
              params: { user_email: userEmail },
            });
            if (cancelled) return;
            setFollowing(Boolean(fRes?.data?.following));
          } else {
            setFollowing(false);
          }
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load conversation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId, ideaId, userEmail]);

  // Send
  const handleSend = async () => {
    const content = composer.trim();
    if (!content || !userEmail) return;
    setSending(true);
    try {
      // convo mode
      if (resolvedConvoId && conversationId) {
        const res = await api.post(`/conversations/${resolvedConvoId}/send`, { sender_email: userEmail, content });
        const sent = res?.data?.message;
        setMessages((prev) => [...prev, sent ?? {
          id: Math.random(),
          content,
          timestamp: new Date().toISOString(),
          read: false,
          from_display: "You",
        }]);
      }
      // idea mode
      else if (ideaId) {
        const res = await api.post(`/ideas/${ideaId}/conversation/send`, { sender_email: userEmail, content });
        const sent = res?.data?.message;
        setMessages((prev) => [...prev, sent ?? {
          id: Math.random(),
          content,
          timestamp: new Date().toISOString(),
          read: false,
          from_display: "You",
        }]);
        setFollowing(true); // server ensures participant after post
      }
      setComposer("");
    } catch (e) {
      console.error("Failed to send:", e);
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending) handleSend();
    }
  };

  // Follow toggle
  const handleToggleFollow = async () => {
    if (!userEmail) return;
    // convo mode → delegate to parent
    if (conversationId && typeof onToggleFollow === "function") {
      await onToggleFollow();
      return;
    }
    // idea mode → keep legacy endpoints
    if (!ideaId) return;
    setFollowBusy(true);
    const prev = following;
    setFollowing(!prev);
    try {
      if (prev) {
        await api.post(`/ideas/${ideaId}/conversation/unfollow`, null, { params: { user_email: userEmail } });
      } else {
        await api.post(`/ideas/${ideaId}/conversation/join`, null, { params: { user_email: userEmail } });
      }
    } catch (e) {
      setFollowing(prev);
    } finally {
      setFollowBusy(false);
    }
  };

  // Derived follow flag (convo mode uses prop; idea mode uses state)
  const followingFlag = conversationId ? !!isFollowing : !!following;

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">{title}</div>
        {userEmail && (
          <button
            className={`px-2 py-1 rounded font-medium disabled:opacity-60 disabled:cursor-not-allowed
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              ${followingFlag
                ? "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                : "bg-blue-600 text-white hover:bg-blue-700"}`}
            onClick={handleToggleFollow}
            disabled={followBusy}
            aria-pressed={followingFlag}
            title={followingFlag ? "Unfollow" : "Follow conversation"}
          >
            {followBusy ? "Please wait…" : (followingFlag ? "Unfollow" : "Follow conversation")}
          </button>
        )}
      </div>

      {loading && <div className="text-sm opacity-60">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div ref={listRef} className="h-[50vh] overflow-y-auto space-y-2 pr-1">
        {messages.map((m) => (
          <div key={m.id} className="p-2 rounded border">
            <div className="text-xs opacity-60">
              {m.timestamp ? new Date(m.timestamp).toLocaleString() : ""} — {m.from_display || m.from_username || "User"}
            </div>
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
        {!loading && messages.length === 0 && (
          <div className="opacity-60">Be the first to start the discussion.</div>
        )}
      </div>

      <div className="mt-3">
        {userEmail ? (
          <>
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
          </>
        ) : (
          <div className="text-sm opacity-70">Sign in to participate in the conversation.</div>
        )}
      </div>
    </div>
  );
}