// src/components/IdeaConversation.jsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";


export default function IdeaConversation({ ideaId, userEmail }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState("");
  const [error, setError] = useState("");

  // follow state
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const listRef = useRef(null);

  useEffect(() => {
  if (!listRef.current) return;
  // Scroll only the internal list, not the whole page
  listRef.current.scrollTo({
    top: listRef.current.scrollHeight,
    behavior: "smooth",
  });
}, [messages]);

  // Get conversation id + load messages + check follow state
  useEffect(() => {
    if (!ideaId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        // Ensure conversation exists; get id
        const idRes = await api.get(`/ideas/${ideaId}/conversation`);
        if (cancelled) return;
        const cid = idRes?.data?.conversation_id;
        setConversationId(cid);

        // Load messages
        const msgRes = await api.get(`/ideas/${ideaId}/conversation/messages`);
        if (cancelled) return;
        const msgs = Array.isArray(msgRes.data) ? msgRes.data : [];
        setMessages(msgs);

        // Check follow state if signed in
        if (userEmail) {
          const fRes = await api.get(
            `/ideas/${ideaId}/conversation/following`,
            { params: { user_email: userEmail } }
          );
          if (cancelled) return;
          setFollowing(Boolean(fRes?.data?.following));
        } else {
          setFollowing(false);
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load idea conversation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ideaId, userEmail]);

  const handleSend = async () => {
    const content = composer.trim();
    if (!content || !userEmail) return;
    setSending(true);
    try {
      const res = await api.post(`/ideas/${ideaId}/conversation/send`, {
        sender_email: userEmail,
        content,
      });
      const sent = res?.data?.message;
      const newMsg = sent ? sent : {
  id: Math.random(),
  content,
  timestamp: new Date().toISOString(),
  read: false,
  from_username: null,
  from_user_id: null,  // until server echoes real one
  from_display: "You",
};
      setMessages((prev) => [...prev, newMsg]);
      setComposer("");
      // Once you post, you are a participant (server ensures it); reflect that
      setFollowing(true);
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

  const toggleFollow = async () => {
    if (!userEmail) return;
    setFollowBusy(true);
    const prev = following;
    setFollowing(!prev); // optimistic
    try {
      if (prev) {
        // Unfollow
        await api.post(`/ideas/${ideaId}/conversation/unfollow`, null, {
          params: { user_email: userEmail },
        });
      } else {
        // Follow
        await api.post(`/ideas/${ideaId}/conversation/join`, null, {
          params: { user_email: userEmail },
        });
      }
    } catch (e) {
      // revert on error
      setFollowing(prev);
    } finally {
      setFollowBusy(false);
    }
  };

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Idea Conversation</div>
        {userEmail && (
          <button
  className={`px-2 py-1 rounded font-medium
              disabled:opacity-60 disabled:cursor-not-allowed
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              ${
                following
                  ? "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
  onClick={toggleFollow}
  disabled={followBusy}
  aria-pressed={following}
  title={following ? "Unfollow" : "Follow conversation"}
>
  {followBusy ? "Please wait…" : following ? "Unfollow" : "Follow conversation"}
</button>
        )}
      </div>

      {loading && <div className="text-sm opacity-60">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div ref={listRef} className="h-[50vh] overflow-y-auto space-y-2 pr-1">
  {messages.map((m) => (
    <div key={m.id} className="p-2 rounded border">
      <div className="text-xs opacity-60">
  {new Date(m.timestamp).toLocaleString()} —{" "}
  {m.from_display
    || m.from_username
    || (m.from_user_id ? `User ${m.from_user_id}` : "User")}
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
          <div className="text-sm opacity-70">
            Sign in to participate in the idea conversation.
          </div>
        )}
      </div>
    </div>
  );
}