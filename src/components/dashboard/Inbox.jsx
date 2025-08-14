// src/components/dashboard/Inbox.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

const GROUP_ORDER = ["system", "problems", "solutions", "forge", "dm"];
const GROUP_LABEL = {
  system: "System",
  problems: "Problems",
  solutions: "Solutions",
  forge: "Forge",
  dm: "Direct",
};

export default function Inbox({ userEmail: userEmailProp, userId, setUnreadCount }) {
  const userEmail = useMemo(() => userEmailProp || userId || "", [userEmailProp, userId]);

  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState("");

  // Mobile pane: 'list' | 'thread'
  const [mobilePane, setMobilePane] = useState("list");

  // Collapsible section state: { system: bool, problems: bool, ... }
  const [openSections, setOpenSections] = useState({});

  const bottomRef = useRef(null);

  // ---------- helpers ----------
  const broadcastUnread = (count) => {
    if (typeof setUnreadCount === "function") setUnreadCount(count);
    localStorage.setItem("unreadCount", String(count));
    window.dispatchEvent(new CustomEvent("inbox:unreadUpdate", { detail: { count } }));
  };

  const computeTotalUnread = (summaries) =>
    summaries.reduce((acc, r) => acc + (r.unread_count || 0), 0);

  const looksLikeEmail = (s) => typeof s === "string" && /\S+@\S+\.\S+/.test(s);

  // Never show raw emails; prefer display → username → User {id} → User
  const formatIdentity = ({ display, username, email, userId }) => {
    if (display && !looksLikeEmail(display)) return display;
    if (username && !looksLikeEmail(username)) return username;
    if (typeof userId === "number") return `User ${userId}`;
    return "User";
  };

  // Unsling “my-problem-title” → “My Problem Title”
  const unslug = (s = "") =>
    s
      .replaceAll("-", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();

  // Extract title from conversation_name when explicit fields aren’t present
  const titleFromConversationName = (name = "") => {
    // patterns: problem:{id}:{slug} | solution:{id}:{slug} | idea:{id}:{slug} (or forge:)
    const parts = name.split(":");
    if (parts.length >= 3) {
      const slug = parts.slice(2).join(":");
      return unslug(slug);
    }
    return "";
  };

  // Grouping
  const getCategory = (r) => {
    const name = r.conversation_name || "";
    if (r.idea_title || name.startsWith("idea:") || name.startsWith("forge:")) return "forge";
    if (r.problem_title || name.startsWith("problem:")) return "problems";
    if (r.solution_title || name.startsWith("solution:")) return "solutions";
    if (name.startsWith("system:")) return "system";
    return "dm";
  };

  // Row label: JUST the title, no prefix
  const labelForRow = (r) => {
    const name = r.conversation_name || "";

    if (r.problem_title) return r.problem_title;
    if (name.startsWith("problem:")) {
      const t = titleFromConversationName(name);
      if (t) return t;
    }

    if (r.solution_title) return r.solution_title;
    if (name.startsWith("solution:")) {
      const t = titleFromConversationName(name);
      if (t) return t;
    }

    if (r.idea_title) return r.idea_title;
    if (name.startsWith("idea:") || name.startsWith("forge:")) {
      const t = titleFromConversationName(name);
      if (t) return t;
    }

    if (name.startsWith("system:")) return "System";

    // DMs / unknown: show identity (no raw email)
    return formatIdentity({
      display: r.other_display,
      username: r.other_username,
      email: r.other_email,
      userId: r.other_user_id ?? r.other_id ?? r.user_id,
    });
  };

  const labelForSelected = () => (selected ? labelForRow(selected) : "");

  const refreshSummaries = async () => {
    if (!userEmail) return;
    const res = await axios.get(`${API}/conversations/summaries/${encodeURIComponent(userEmail)}`);
    const data = Array.isArray(res.data) ? res.data : [];
    setRows(data);
    broadcastUnread(computeTotalUnread(data));
  };

  // Build groups + unread counts
  const groups = useMemo(() => {
    const g = { system: [], problems: [], solutions: [], forge: [], dm: [] };
    for (const r of rows) g[getCategory(r)].push(r);
    for (const k of Object.keys(g)) {
      g[k].sort((a, b) => new Date(b.last_timestamp || 0) - new Date(a.last_timestamp || 0));
    }
    const unread = Object.fromEntries(
      Object.entries(g).map(([k, arr]) => [k, arr.reduce((a, r) => a + (r.unread_count || 0), 0)])
    );
    return { items: g, unread };
  }, [rows]);

  // Initialize / auto-update collapsible sections:
  // - default closed
  // - open any section that has unread > 0 (also auto-opens later if unread arrives)
  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      for (const k of GROUP_ORDER) {
        const hasUnread = (groups.unread?.[k] || 0) > 0;
        if (!(k in next)) {
          next[k] = hasUnread; // initial
        } else if (hasUnread && !next[k]) {
          next[k] = true; // auto-open when unread appears
        }
      }
      return next;
    });
  }, [groups.unread]);

  // Scroll to bottom when thread updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  // Initial fetch
  useEffect(() => {
    if (!userEmail) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingRows(true);
        await refreshSummaries();
      } catch (e) {
        if (!cancelled) setError("Failed to load conversations.");
      } finally {
        if (!cancelled) setLoadingRows(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userEmail]);

  // Load thread on select
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
          from_user_id: m.from_user_id,
          from_display: formatIdentity({
            display: m.from_display,
            username: m.from_username,
            email: m.from_email,
            userId: m.from_user_id,
          }),
        }));
        setThread(normalized);

        // Mark unread messages as read
        const unreadIds = normalized.filter((m) => !m.read).map((m) => m.id);
        if (unreadIds.length > 0) {
          try {
            await Promise.all(unreadIds.map((id) => axios.post(`${API}/inbox/read/${id}`)));
            setThread((prev) => prev.map((m) => (unreadIds.includes(m.id) ? { ...m, read: true } : m)));
            setRows((prev) =>
              prev.map((r) =>
                r.conversation_id === selected.conversation_id ? { ...r, unread_count: 0 } : r
              )
            );
            await refreshSummaries();
          } catch {
            /* ignore */
          }
        }

        // Switch to thread on mobile
        setMobilePane("thread");
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected]);

  // Actions
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
            from_user_id: sent.from_user_id,
            from_display: formatIdentity({
              display: sent.from_display,
              username: sent.from_username,
              email: sent.from_email,
              userId: sent.from_user_id,
            }),
          }
        : {
            id: Math.random(),
            content,
            timestamp: new Date().toISOString(),
            read: false,
            from_email: userEmail,
            from_username: null,
            from_user_id: undefined,
            from_display: "You",
          };

      setThread((prev) => [...prev, newMsg]);
      setComposer("");

      // Update preview + ordering in the left list
      setRows((prev) => {
        const next = [...prev];
        const idx = next.findIndex((r) => r.conversation_id === selected.conversation_id);
        if (idx !== -1) {
          next[idx] = {
            ...next[idx],
            last_content: newMsg.content,
            last_timestamp: newMsg.timestamp,
          };
          next.sort((a, b) => new Date(b.last_timestamp || 0) - new Date(a.last_timestamp || 0));
        }
        return next;
      });
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

  const handleLeave = async () => {
    if (!selected?.conversation_id || !userEmail) return;

    try {
      const name = selected.conversation_name || "";

      // Idea/Forge → reuse unfollow
      if (name.startsWith("idea:") || name.startsWith("forge:")) {
        const ideaId = parseInt(name.split(":")[1], 10);
        if (!Number.isNaN(ideaId)) {
          await axios.post(
            `${API}/ideas/${ideaId}/conversation/unfollow`,
            null,
            { params: { user_email: userEmail } }
          );
        }
      }
      // (Optional) add similar unfollow routes for problems/solutions if desired
      else if (name.startsWith("system:")) {
        alert("You can’t remove your System conversation.");
        return;
      } else {
        await axios.post(`${API}/conversations/${selected.conversation_id}/leave`, {
          user_email: userEmail,
        });
      }

      setRows((prev) => prev.filter((r) => r.conversation_id !== selected.conversation_id));
      setSelected(null);
      setThread([]);
      await refreshSummaries();
      setMobilePane("list");
    } catch (e) {
      console.error("Leave failed:", e);
      alert("Failed to leave conversation.");
    }
  };

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
      setMobilePane("list");
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete conversation.");
    }
  };

  // ---------- UI ----------
  if (!userEmail) {
    return <p className="text-[var(--muted)] italic">Log in to view your inbox.</p>;
  }

  const Section = ({ id, title, items, unread, open, onToggle }) => {
    if (!items?.length) return null;
    return (
      <div className="mb-2">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-[color-mix(in_oklab,var(--bg)_85%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
          style={{ WebkitTapHighlightColor: "transparent" }}
          aria-expanded={open}
        >
          <span className="text-xs uppercase tracking-wide opacity-70">{title}</span>
          <span className="flex items-center gap-2">
            {typeof unread === "number" && unread > 0 && (
              <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full">{unread}</span>
            )}
            <span
              className="inline-block transition-transform"
              style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
            >
              ▶
            </span>
          </span>
        </button>

        {open && (
          <div className="space-y-1 mt-1">
            {items.map((r) => {
              const isSel = selected?.conversation_id === r.conversation_id;
              const label = labelForRow(r);
              return (
                <button
                  key={r.conversation_id}
                  type="button"
                  onClick={() => {
                    setSelected(r);
                    setThread([]);
                  }}
                  aria-selected={isSel}
                  title={label}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                  className={[
                    "convo-row w-full text-left p-2 rounded flex items-center justify-between",
                    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
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
        )}
      </div>
    );
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {/* Left: conversation list */}
      <div
        className={[
          "md:col-span-1 border rounded p-2 h-[60vh] md:h-[70vh] overflow-auto convo-list",
          mobilePane === "list" ? "" : "hidden md:block",
        ].join(" ")}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Conversations</div>
          {loadingRows && <div className="text-xs opacity-60">Loading…</div>}
        </div>
        {error && <div className="text-sm text-red-500 dark:text-red-400">{error}</div>}

        {GROUP_ORDER.map((key) => (
          <Section
            key={key}
            id={key}
            title={GROUP_LABEL[key]}
            items={groups.items[key]}
            unread={groups.unread[key]}
            open={!!openSections[key]}
            onToggle={() =>
              setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
            }
          />
        ))}
      </div>

      {/* Right: thread + composer */}
      <div
        className={[
          "md:col-span-2 border rounded p-2 md:p-3 flex flex-col h-[70vh]",
          mobilePane === "thread" ? "" : "hidden md:flex",
        ].join(" ")}
      >
        {!selected ? (
          <div className="opacity-60">Select a conversation</div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                {/* Back on mobile */}
                <button className="btn btn-secondary md:hidden" onClick={() => setMobilePane("list")}>
                  ← Back
                </button>
                <div className="text-sm opacity-70 truncate">{labelForSelected()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-secondary" onClick={handleLeave}>
                  {selected.conversation_name?.startsWith("idea:") ||
                  selected.conversation_name?.startsWith("forge:")
                    ? "Unfollow"
                    : selected.conversation_name?.startsWith("system:")
                    ? "OK"
                    : "Leave"}
                </button>
                {userEmail === "sheaklipper@gmail.com" && (
                  <button className="btn btn-danger" onClick={handleAdminDelete}>
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {loadingThread && <div className="text-sm opacity-60">Loading thread…</div>}
              {thread.map((m) => (
                <div
                  key={m.id}
                  className="p-2 rounded border"
                  style={{
                    borderColor: "var(--border)",
                    background: "color-mix(in oklab, var(--bg-elev) 94%, transparent)",
                  }}
                >
                  <div className="text-xs opacity-60 mb-1">
                    {m.timestamp ? new Date(m.timestamp).toLocaleString() : ""} — {m.from_display}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
              {!loadingThread && thread.length === 0 && <div className="opacity-60">No messages yet.</div>}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="mt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="text-xs opacity-70 mb-1 mt-2">Sending to: {labelForSelected()}</div>
              <textarea
                className="w-full border rounded p-2 h-24"
                placeholder="Write a message… (Enter to send, Shift+Enter for newline)"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                onKeyDown={onComposerKeyDown}
                disabled={sending}
                style={{ borderColor: "var(--border)", background: "var(--bg-elev)", color: "var(--text)" }}
              />
              <div className="mt-2 flex justify-end">
                <button className="btn" onClick={handleSend} disabled={sending || !composer.trim()}>
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