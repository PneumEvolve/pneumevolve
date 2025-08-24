// src/components/ConversationPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * Reusable conversation panel.
 *
 * Props:
 * - userEmail: string | null
 * - headers?: Record<string,string>  // pass your memoized headers (Authorization, x-user-email)
 * - conversationId?: number          // MODE A: direct conversation
 * - resource?: {                     // MODE B: resource-backed conversation
 *     base: string;                  // e.g., `/forge/items/123` or `/forge/problems/456`
 *   }
 * - title?: string                   // default "Conversation"
 * - showInboxLink?: boolean          // default true; shows "Open in Inbox →" when conversation is known
 * - onResolved?: (conversationId:number)=>void
 * - height?: string                  // scroll area height, default "h-[50vh]"
 */
export default function ConversationPanel({
  userEmail,
  headers,
  conversationId: convoIdProp,
  resource,
  title = "Conversation",
  showInboxLink = true,
  onResolved,
  height = "h-[50vh]",
}) {
  const [conversationId, setConversationId] = useState(convoIdProp ?? null);
  const [messages, setMessages] = useState([]);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState("");
  const [error, setError] = useState("");

  const listRef = useRef(null);
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const isConvoMode = typeof convoIdProp === "number" || typeof conversationId === "number";
  const base = resource?.base; // e.g., `/forge/items/123`

  // Resolve conversation id (resource mode), load messages, and following flag.
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError("");

        // MODE A: Conversation ID is known
        if (isConvoMode) {
          const cid = convoIdProp ?? conversationId;
          if (!cid) throw new Error("No conversationId provided.");
          // messages
          const res = await api.get(`/conversations/${cid}/messages`, { headers });
          if (cancelled) return;
          setConversationId(cid);
          setMessages(Array.isArray(res.data) ? res.data : []);
          // following: rely on server/global follow or omit; if you want strict flag,
          // optionally add `/conversations/:id/following?user_email=...` later.
          if (userEmail) setFollowing(true); // heuristic; adjust if you add a real endpoint
        }
        // MODE B: Resource-backed
        else if (base) {
          // resolve id
          const idRes = await api.get(`${base}/conversation`, { headers });
          if (cancelled) return;
          const cid = idRes?.data?.conversation_id ?? null;
          setConversationId(cid);
          if (cid && typeof onResolved === "function") onResolved(cid);

          // messages
          const msgRes = await api.get(`${base}/conversation/messages`, { headers });
          if (cancelled) return;
          setMessages(Array.isArray(msgRes.data) ? msgRes.data : []);

          // follow state
          if (userEmail) {
            try {
              const fRes = await api.get(`${base}/conversation/following`, {
                params: { user_email: userEmail },
                headers,
              });
              if (!cancelled) setFollowing(Boolean(fRes?.data?.following));
            } catch {
              if (!cancelled) setFollowing(false);
            }
          } else {
            setFollowing(false);
          }
        } else {
          throw new Error("ConversationPanel: provide either conversationId or resource.base");
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load conversation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [convoIdProp, isConvoMode, base, userEmail, headers, onResolved]);

  async function handleSend() {
    const content = composer.trim();
    if (!content || !userEmail) return;
    setSending(true);
    try {
      // MODE A
      if (isConvoMode && conversationId) {
        const res = await api.post(
          `/conversations/${conversationId}/send`,
          { sender_email: userEmail, content },
          { headers }
        );
        const sent = res?.data?.message;
        setMessages((prev) => [
          ...prev,
          sent ?? {
            id: Math.random(),
            content,
            timestamp: new Date().toISOString(),
            read: false,
            from_display: "You",
          },
        ]);
      }
      // MODE B
      else if (base) {
        const res = await api.post(
          `${base}/conversation/send`,
          { sender_email: userEmail, content },
          { headers }
        );
        const sent = res?.data?.message;
        setMessages((prev) => [
          ...prev,
          sent ?? {
            id: Math.random(),
            content,
            timestamp: new Date().toISOString(),
            read: false,
            from_display: "You",
          },
        ]);
        setFollowing(true); // server should add participant
      }
      setComposer("");
    } catch (e) {
      console.error("send failed", e);
    } finally {
      setSending(false);
    }
  }

  function onComposerKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending) handleSend();
    }
  }

  async function toggleFollow() {
    if (!userEmail) return;
    if (!base && !conversationId) return; // need a target

    setFollowBusy(true);
    const prev = following;
    setFollowing(!prev);
    try {
      // Prefer resource endpoints for follow/unfollow (clean ownership semantics).
      if (base) {
        if (prev) {
          await api.post(`${base}/conversation/unfollow`, null, {
            params: { user_email: userEmail },
            headers,
          });
        } else {
          await api.post(`${base}/conversation/join`, null, {
            params: { user_email: userEmail },
            headers,
          });
        }
      } else if (conversationId) {
        // If you later add global follow routes, wire them here:
        // await api.post(`/conversations/${conversationId}/${prev ? 'unfollow' : 'join'}`, null, { params:{user_email:userEmail}, headers });
      }
    } catch (e) {
      setFollowing(prev); // revert
    } finally {
      setFollowBusy(false);
    }
  }

  const inboxHref = conversationId ? `/Account#inbox` : null;

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold flex items-center gap-2">
          <span>{title}</span>
          {showInboxLink && inboxHref && (
            <a
              href={inboxHref}
              className="text-xs underline opacity-80 hover:opacity-100"
              title="Open this thread in your Inbox"
            >
              Open in Inbox →
            </a>
          )}
        </div>
        {userEmail && (
          <button
            className={`px-2 py-1 rounded font-medium disabled:opacity-60 disabled:cursor-not-allowed
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              ${following
                ? "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                : "bg-blue-600 text-white hover:bg-blue-700"}`}
            onClick={toggleFollow}
            disabled={followBusy}
            aria-pressed={following}
            title={following ? "Unfollow" : "Follow conversation"}
          >
            {followBusy ? "Please wait…" : (following ? "Unfollow" : "Follow conversation")}
          </button>
        )}
      </div>

      {loading && <div className="text-sm opacity-60">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div ref={listRef} className={`${height} overflow-y-auto space-y-2 pr-1`}>
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