// src/components/dashboard/Inbox.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

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
  const [mobilePane, setMobilePane] = useState("list");
  const [openSections, setOpenSections] = useState({});

  const bottomRef = useRef(null);

  const broadcastUnread = (count) => {
    if (typeof setUnreadCount === "function") setUnreadCount(count);
    localStorage.setItem("unreadCount", String(count));
    window.dispatchEvent(new CustomEvent("inbox:unreadUpdate", { detail: { count } }));
  };

  const computeTotalUnread = (summaries) =>
    summaries.reduce((acc, r) => acc + (r.unread_count || 0), 0);

  const looksLikeEmail = (s) => typeof s === "string" && /\S+@\S+\.\S+/.test(s);

  const formatIdentity = ({ display, username, email, userId }) => {
    if (display && !looksLikeEmail(display)) return display;
    if (username && !looksLikeEmail(username)) return username;
    if (typeof userId === "number") return `User ${userId}`;
    return "User";
  };

  const unslug = (s = "") =>
    s.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();

  const titleFromConversationName = (name = "") => {
    const parts = name.split(":");
    if (parts.length >= 3) return unslug(parts.slice(2).join(":"));
    return "";
  };

  const getCategory = (r) => {
    const name = r.conversation_name || "";
    if (r.idea_title || name.startsWith("idea:") || name.startsWith("forge:")) return "forge";
    if (r.problem_title || name.startsWith("problem:")) return "problems";
    if (r.solution_title || name.startsWith("solution:")) return "solutions";
    if (name.startsWith("system:")) return "system";
    return "dm";
  };

  const labelForRow = (r) => {
    const name = r.conversation_name || "";
    if (r.title?.trim()) return r.title.trim();
    if (r.problem_title) return r.problem_title;
    if (name.startsWith("problem:")) { const t = titleFromConversationName(name); if (t) return t; }
    if (r.solution_title) return r.solution_title;
    if (name.startsWith("solution:")) { const t = titleFromConversationName(name); if (t) return t; }
    if (r.idea_title) return r.idea_title;
    if (name.startsWith("idea:") || name.startsWith("forge:")) { const t = titleFromConversationName(name); if (t) return t; }
    if (name.startsWith("system:")) return "System";
    return formatIdentity({ display: r.other_display, username: r.other_username, email: r.other_email, userId: r.other_user_id ?? r.other_id ?? r.user_id });
  };

  const labelForSelected = () => (selected ? labelForRow(selected) : "");

  const refreshSummaries = async () => {
    if (!userEmail) return;
    const res = await api.get(`/conversations/summaries/${encodeURIComponent(userEmail)}`);
    const data = Array.isArray(res.data) ? res.data : [];
    setRows(data);
    broadcastUnread(computeTotalUnread(data));
  };

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

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      for (const k of GROUP_ORDER) {
        const hasUnread = (groups.unread?.[k] || 0) > 0;
        if (!(k in next)) next[k] = hasUnread;
        else if (hasUnread && !next[k]) next[k] = true;
      }
      return next;
    });
  }, [groups.unread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

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
    return () => { cancelled = true; };
  }, [userEmail]);

  useEffect(() => {
    if (!selected?.conversation_id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingThread(true);
        const res = await api.get(`/conversations/${selected.conversation_id}/messages`);
        if (cancelled) return;
        const msgs = Array.isArray(res.data) ? res.data : [];
        const normalized = msgs.map((m) => ({
          id: m.id, content: m.content, timestamp: m.timestamp, read: m.read,
          from_email: m.from_email, from_username: m.from_username, from_user_id: m.from_user_id,
          from_display: formatIdentity({ display: m.from_display, username: m.from_username, email: m.from_email, userId: m.from_user_id }),
        }));
        setThread(normalized);
        const unreadIds = normalized.filter((m) => !m.read).map((m) => m.id);
        if (unreadIds.length > 0) {
          try {
            await Promise.all(unreadIds.map((id) => api.post(`/inbox/read/${id}`)));
            setThread((prev) => prev.map((m) => (unreadIds.includes(m.id) ? { ...m, read: true } : m)));
            setRows((prev) => prev.map((r) => r.conversation_id === selected.conversation_id ? { ...r, unread_count: 0 } : r));
            await refreshSummaries();
          } catch { /* ignore */ }
        }
        setMobilePane("thread");
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected]);

  const handleSend = async () => {
    const content = composer.trim();
    if (!content || !selected?.conversation_id || !userEmail) return;
    setSending(true);
    try {
      const res = await api.post(`/conversations/${selected.conversation_id}/send`, { sender_email: userEmail, content });
      const sent = res?.data?.message;
      const newMsg = sent
        ? { id: sent.id, content: sent.content, timestamp: sent.timestamp, read: sent.read, from_email: sent.from_email, from_username: sent.from_username, from_user_id: sent.from_user_id, from_display: formatIdentity({ display: sent.from_display, username: sent.from_username, email: sent.from_email, userId: sent.from_user_id }) }
        : { id: Math.random(), content, timestamp: new Date().toISOString(), read: false, from_email: userEmail, from_username: null, from_user_id: undefined, from_display: "You" };
      setThread((prev) => [...prev, newMsg]);
      setComposer("");
      setRows((prev) => {
        const next = [...prev];
        const idx = next.findIndex((r) => r.conversation_id === selected.conversation_id);
        if (idx !== -1) { next[idx] = { ...next[idx], last_content: newMsg.content, last_timestamp: newMsg.timestamp }; next.sort((a, b) => new Date(b.last_timestamp || 0) - new Date(a.last_timestamp || 0)); }
        return next;
      });
    } catch (e) { console.error("Failed to send:", e); }
    finally { setSending(false); }
  };

  const onComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!sending) handleSend(); }
  };

  const handleLeave = async () => {
    if (!selected?.conversation_id || !userEmail) return;
    try {
      const name = selected.conversation_name || "";
      if (name.startsWith("idea:") || name.startsWith("forge:")) {
        const ideaId = parseInt(name.split(":")[1], 10);
        if (!Number.isNaN(ideaId)) await api.post(`/ideas/${ideaId}/conversation/unfollow`, null, { params: { user_email: userEmail } });
      } else if (name.startsWith("system:")) { alert("You can't remove your System conversation."); return; }
      else { await api.post(`/conversations/${selected.conversation_id}/leave`, { user_email: userEmail }); }
      setRows((prev) => prev.filter((r) => r.conversation_id !== selected.conversation_id));
      setSelected(null); setThread([]); await refreshSummaries(); setMobilePane("list");
    } catch { alert("Failed to leave conversation."); }
  };

  const handleAdminDelete = async () => {
    if (!selected?.conversation_id || userEmail !== "sheaklipper@gmail.com") return;
    if (!window.confirm("Delete this conversation for everyone? This cannot be undone.")) return;
    try {
      await api.delete(`/conversations/${selected.conversation_id}`, { params: { user_email: userEmail } });
      setRows((prev) => prev.filter((r) => r.conversation_id !== selected.conversation_id));
      setSelected(null); setThread([]); await refreshSummaries(); setMobilePane("list");
    } catch { alert("Failed to delete conversation."); }
  };

  const leaveLabel = () => {
    const name = selected?.conversation_name || "";
    if (name.startsWith("idea:") || name.startsWith("forge:")) return "Unfollow";
    if (name.startsWith("system:")) return "OK";
    return "Leave";
  };

  if (!userEmail) return <p className="text-[var(--muted)] italic">Log in to view your inbox.</p>;

  const Section = ({ id, items, unread, open, onToggle }) => {
    if (!items?.length) return null;
    const label = GROUP_LABEL[id];
    return (
      <div className="mb-1">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between px-3 py-3 rounded-xl transition-colors hover:bg-[color-mix(in_oklab,var(--bg-elev)_80%,transparent)] active:scale-[0.98]"
          style={{ WebkitTapHighlightColor: "transparent", minHeight: 48 }}
          aria-expanded={open}
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-block transition-transform duration-200"
              style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", fontSize: 10, opacity: 0.4 }}
            >
              ▶
            </span>
            <span className="text-sm font-medium">{label}</span>
            {typeof unread === "number" && unread > 0 && (
              <span className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded-full font-medium leading-tight">
                {unread}
              </span>
            )}
          </div>
          <span className="text-xs opacity-30">{items.length}</span>
        </button>

        {open && (
          <div className="space-y-0.5 ml-2 mb-2">
            {items.map((r) => {
              const isSel = selected?.conversation_id === r.conversation_id;
              const label = labelForRow(r);
              const preview = r.last_content ? String(r.last_content).slice(0, 60) : null;
              return (
                <button
                  key={r.conversation_id}
                  type="button"
                  onClick={() => { setSelected(r); setThread([]); }}
                  aria-selected={isSel}
                  style={{
                    WebkitTapHighlightColor: "transparent",
                    minHeight: 56,
                    background: isSel ? "color-mix(in oklab, var(--bg-elev) 100%, transparent)" : "transparent",
                    borderLeft: isSel ? "2px solid var(--text)" : "2px solid transparent",
                  }}
                  className="w-full text-left px-3 py-3 rounded-r-xl transition-colors hover:bg-[color-mix(in_oklab,var(--bg-elev)_60%,transparent)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm truncate ${isSel ? "font-medium" : ""} ${r.unread_count > 0 ? "font-semibold" : ""}`}>
                      {label}
                    </span>
                    {r.unread_count > 0 && (
                      <span className="shrink-0 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                        {r.unread_count}
                      </span>
                    )}
                  </div>
                  {preview && (
                    <div className="text-xs opacity-40 truncate mt-0.5">{preview}</div>
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
    <div className="grid md:grid-cols-3 gap-0 md:gap-4">
      {/* Left: conversation list */}
      <div
        className={[
          "md:col-span-1 md:border md:rounded-xl md:p-2 h-[65vh] md:h-[70vh] overflow-auto",
          mobilePane === "list" ? "block" : "hidden md:block",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="font-semibold text-sm">Conversations</div>
          {loadingRows && <div className="text-xs opacity-40">Loading…</div>}
        </div>
        {error && <div className="text-sm text-red-500 px-3 mb-2">{error}</div>}

        {GROUP_ORDER.map((key) => (
          <Section
            key={key}
            id={key}
            items={groups.items[key]}
            unread={groups.unread[key]}
            open={!!openSections[key]}
            onToggle={() => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))}
          />
        ))}
      </div>

      {/* Right: thread + composer */}
      <div
        className={[
          "md:col-span-2 border rounded-xl flex flex-col h-[70vh]",
          mobilePane === "thread" ? "flex" : "hidden md:flex",
        ].join(" ")}
      >
        {!selected ? (
          <div className="flex-1 flex items-center justify-center opacity-40 text-sm">
            Select a conversation
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div
              className="flex items-center justify-between px-3 py-3 border-b shrink-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  className="md:hidden shrink-0 flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--border)] text-sm active:scale-95 transition-transform"
                  onClick={() => setMobilePane("list")}
                  aria-label="Back"
                >
                  ←
                </button>
                <div className="text-sm font-medium truncate">{labelForSelected()}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  className="text-xs px-3 py-1.5 rounded-xl border border-[var(--border)] active:scale-95 transition-transform"
                  onClick={handleLeave}
                >
                  {leaveLabel()}
                </button>
                {userEmail === "sheaklipper@gmail.com" && (
                  <button
                    className="text-xs px-3 py-1.5 rounded-xl border border-red-500/40 text-red-500 active:scale-95 transition-transform"
                    onClick={handleAdminDelete}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto px-3 py-3 space-y-3">
              {loadingThread && (
                <div className="text-sm opacity-40 text-center py-4">Loading…</div>
              )}
              {thread.map((m) => (
                <div key={m.id} className="space-y-1">
                  <div className="text-[11px] opacity-40 px-1">
                    {m.from_display} · {m.timestamp ? new Date(m.timestamp).toLocaleString() : ""}
                  </div>
                  <div
                    className="rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                      background: "color-mix(in oklab, var(--bg-elev) 90%, transparent)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {!loadingThread && thread.length === 0 && (
                <div className="opacity-40 text-sm text-center py-8">No messages yet.</div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div
              className="shrink-0 px-3 py-3 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <textarea
                className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none transition"
                style={{
                  height: 72,
                  border: "1px solid var(--border)",
                  background: "var(--bg-elev)",
                  color: "var(--text)",
                }}
                placeholder="Write a message…"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                onKeyDown={onComposerKeyDown}
                disabled={sending}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] opacity-30 hidden sm:block">
                  Enter to send · Shift+Enter for newline
                </span>
                <button
                  className="px-4 py-2 rounded-xl text-sm font-medium transition active:scale-95 disabled:opacity-40"
                  style={{
                    background: composer.trim() ? "var(--text)" : "var(--bg-elev)",
                    color: composer.trim() ? "var(--bg)" : "var(--text)",
                    border: "1px solid var(--border)",
                  }}
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