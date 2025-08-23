// src/components/ItemConversation.jsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export default function ItemConversation({ itemId, userEmail }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState("");
  const [error, setError] = useState("");

  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const listRef = useRef(null);
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const idRes = await api.get(`/forge/items/${itemId}/conversation`);
        if (cancelled) return;
        const cid = idRes?.data?.conversation_id;
        setConversationId(cid);

        const msgRes = await api.get(`/forge/items/${itemId}/conversation/messages`);
        if (cancelled) return;
        setMessages(Array.isArray(msgRes.data) ? msgRes.data : []);

        if (userEmail) {
          const fRes = await api.get(`/forge/items/${itemId}/conversation/following`, {
            params: { user_email: userEmail },
          });
          if (cancelled) return;
          setFollowing(Boolean(fRes?.data?.following));
        } else {
          setFollowing(false);
        }
      } catch (e) {
        if (!cancelled) setError("Conversation unavailable for this item.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [itemId, userEmail]);

  const handleSend = async () => {
    const content = composer.trim();
    if (!content || !userEmail) return;
    setSending(true);
    try {
      const res = await api.post(`/forge/items/${itemId}/conversation/send`, {
        sender_email: userEmail,
        content,
      });
      const sent = res?.data?.message;
      const newMsg = sent || {
        id: Math.random(),
        content,
        timestamp: new Date().toISOString(),
        read: false,
        from_display: "You",
      };
      setMessages((prev) => [...prev, newMsg]);
      setComposer("");
      setFollowing(true);
    } catch (e) {
      console.error("send failed", e);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending) handleSend();
    }
  };

  const toggleFollow = async () => {
    if (!userEmail) return;
    setFollowBusy(true);
    const prev = following;
    setFollowing(!prev);
    try {
      if (prev) {
        await api.post(`/forge/items/${itemId}/conversation/unfollow`, null, {
          params: { user_email: userEmail },
        });
      } else {
        await api.post(`/forge/items/${itemId}/conversation/join`, null, {
          params: { user_email: userEmail },
        });
      }
    } catch (e) {
      setFollowing(prev);
    } finally {
      setFollowBusy(false);
    }
  };

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Conversation</div>
        {userEmail && (
          <button
            className={`px-2 py-1 rounded font-medium ${following ? "bg-zinc-200 dark:bg-zinc-700" : "bg-blue-600 text-white"}`}
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
              {m.timestamp ? new Date(m.timestamp).toLocaleString() : ""} —{" "}
              {m.from_display || m.from_username || (m.from_user_id ? `User ${m.from_user_id}` : "User")}
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
              onKeyDown={onKeyDown}
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