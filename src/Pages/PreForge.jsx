// src/Pages/PreForge.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/**
 * PreForge (local-first, optional sync) — with tombstones + correct merging
 *
 * ✅ Works without login (localStorage)
 * ✅ Sync local -> backend via POST /preforge/sync
 * ✅ Pull backend -> local via GET /preforge/topics (MERGES, does NOT overwrite)
 *
 * Tombstones:
 * - deletedTopicClientIds: string[]  (prevents resurrecting deleted topics)
 *
 * Merge rules:
 * - Topics keyed by client_id
 * - If a topic is tombstoned locally -> never re-add it from server
 * - If both exist -> keep the one with newer updatedAt (local) vs updated_at (server)
 * - Items keyed by client_id inside topic:
 *    - merge union, pick newer updatedAt when both exist
 *
 * Note: we keep "activeId" as topic.client_id in local state.
 */

const LS_KEY = "pe_preforge_local_v3";

// ----------------- utils -----------------
function safeUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTag(s) {
  return (s || "").trim().replace(/\s+/g, " ").replace(/^#/, "");
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function parseTime(x) {
  const t = x ? Date.parse(x) : NaN;
  return Number.isFinite(t) ? t : 0;
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveLocal(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

// ----------------- UI helpers -----------------
function CardShell({ title, subtitle, children, right }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle ? <p className="text-xs text-[var(--muted)]">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SmallButton({ children, onClick, type = "button", variant = "default", disabled }) {
  const base =
    "rounded-xl border px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "ghost"
      ? "border-[var(--border)] bg-[var(--bg)]"
      : "border-[var(--border)] bg-[var(--bg-elev)]";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

function ChipButton({ children, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs shadow-sm transition
        border-[var(--border)]
        ${active ? "bg-[var(--bg-elev)] opacity-100" : "bg-[var(--bg)] opacity-80 hover:opacity-100"}`}
    >
      {children}
    </button>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs text-[var(--muted)]">
      {children}
    </span>
  );
}

function TagPill({ text, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs">
      <span className="text-[var(--text)]">{text}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="Remove tag"
          title="Remove tag"
        >
          ✕
        </button>
      ) : null}
    </span>
  );
}

function TextInput({ value, onChange, placeholder, onKeyDown, disabled }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      disabled={disabled}
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] disabled:opacity-50"
      placeholder={placeholder}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 4, disabled }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      disabled={disabled}
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] disabled:opacity-50"
      placeholder={placeholder}
    />
  );
}

function NoteRow({ item, onPin, onDelete, onEdit }) {
  const created = item?.createdAt || item?.created_at || null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>{item.kind === "question" ? "Question" : "Note"}</Pill>
            {created ? (
              <span className="text-[11px] text-[var(--muted)]">
                {new Date(created).toLocaleString()}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-[var(--text)] whitespace-pre-wrap break-words">
            {item.text}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onPin}
            className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
            aria-label="Pin"
            title="Pin"
          >
            📌
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
            aria-label="Edit"
            title="Edit"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
            aria-label="Delete"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------- Local shape + seed -----------------
function ensureClientIds(state) {
  const topics = (state?.topics || []).map((t) => ({
    ...t,
    client_id: t.client_id || safeUUID(),
    tags: Array.isArray(t.tags) ? t.tags.map(normalizeTag).filter(Boolean) : [],
    items: (t.items || []).map((it) => ({
      ...it,
      client_id: it.client_id || safeUUID(),
    })),
    createdAt: t.createdAt || t.created_at || new Date().toISOString(),
    updatedAt: t.updatedAt || t.updated_at || new Date().toISOString(),
  }));

  return {
    version: 3,
    topics,
    deletedTopicClientIds: uniq(state?.deletedTopicClientIds || state?.deleted_topic_client_ids || []),
  };
}

function makeSeedLocal() {
  const topicClientId = safeUUID();
  const now = new Date().toISOString();
  return {
    version: 3,
    deletedTopicClientIds: [],
    topics: [
      {
        client_id: topicClientId,
        title: "PneumEvolve",
        pinned: "What do I want PneumEvolve to become right now?",
        tags: ["PneumEvolve"],
        items: [
          { client_id: safeUUID(), kind: "note", text: "I keep trying to solve everything at once. I need a smaller problem.", createdAt: now, updatedAt: now },
          { client_id: safeUUID(), kind: "question", text: "If this only helped ONE person, what would it help them do?", createdAt: now, updatedAt: now },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

// server -> local
function serverToLocalTopic(t) {
  return {
    client_id: t.client_id || safeUUID(),
    title: t.title || "",
    pinned: t.pinned || "",
    tags: Array.isArray(t.tags) ? t.tags.map(normalizeTag).filter(Boolean) : [],
    items: Array.isArray(t.items)
      ? t.items.map((it) => ({
          client_id: it.client_id || safeUUID(),
          kind: it.kind,
          text: it.text,
          createdAt: it.created_at,
          updatedAt: it.updated_at,
        }))
      : [],
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

// local -> sync payload
function localToSyncPayload(localTopics, deletedTopicClientIds) {
  return {
    topics: (localTopics || []).map((t) => ({
      client_id: t.client_id,
      title: (t.title || "").trim(),
      pinned: t.pinned || "",
      tags: (t.tags || []).map(normalizeTag).filter(Boolean),
      items: (t.items || []).map((it) => ({
        client_id: it.client_id,
        kind: it.kind || "note",
        text: it.text || "",
      })),
    })),
    deleted_topic_client_ids: (deletedTopicClientIds || []).filter(Boolean),
  };
}

// ----------------- MERGING (correct) -----------------
function mergeItems(localItems = [], serverItems = []) {
  const byId = new Map();

  // seed local first
  for (const it of localItems || []) {
    if (!it?.client_id) continue;
    byId.set(it.client_id, { ...it });
  }

  // merge server in
  for (const it of serverItems || []) {
    if (!it?.client_id) continue;
    const existing = byId.get(it.client_id);
    if (!existing) {
      byId.set(it.client_id, { ...it });
      continue;
    }

    // pick newer
    const a = parseTime(existing.updatedAt || existing.updated_at || existing.createdAt || existing.created_at);
    const b = parseTime(it.updatedAt || it.updated_at || it.createdAt || it.created_at);
    byId.set(it.client_id, b >= a ? { ...existing, ...it } : { ...it, ...existing });
  }

  const merged = Array.from(byId.values());

  // newest first
  merged.sort((a, b) => {
    const ta = parseTime(a.createdAt || a.created_at);
    const tb = parseTime(b.createdAt || b.created_at);
    return tb - ta;
  });

  return merged;
}

function mergeTopics(localTopics = [], serverTopics = [], deletedTopicClientIds = []) {
  const tomb = new Set(deletedTopicClientIds || []);
  const byId = new Map();

  // add local first (excluding tombstones)
  for (const t of localTopics || []) {
    if (!t?.client_id) continue;
    if (tomb.has(t.client_id)) continue;
    byId.set(t.client_id, { ...t });
  }

  // merge server in (excluding tombstones)
  for (const t of serverTopics || []) {
    if (!t?.client_id) continue;
    if (tomb.has(t.client_id)) continue;

    const existing = byId.get(t.client_id);
    if (!existing) {
      byId.set(t.client_id, { ...t });
      continue;
    }

    // merge fields based on updatedAt newer
    const a = parseTime(existing.updatedAt || existing.updated_at || existing.createdAt || existing.created_at);
    const b = parseTime(t.updatedAt || t.updated_at || t.createdAt || t.created_at);

    const newerIsServer = b >= a;

    const mergedItems = mergeItems(existing.items || [], t.items || []);
    const mergedTags = uniq([...(existing.tags || []), ...(t.tags || [])].map(normalizeTag).filter(Boolean));

    byId.set(t.client_id, {
      ...(newerIsServer ? { ...existing, ...t } : { ...t, ...existing }),
      tags: mergedTags,
      items: mergedItems,
      // ensure timestamps exist
      createdAt: existing.createdAt || t.createdAt || existing.created_at || t.created_at || new Date().toISOString(),
      updatedAt:
        (newerIsServer ? (t.updatedAt || t.updated_at) : (existing.updatedAt || existing.updated_at)) ||
        existing.updatedAt ||
        t.updatedAt ||
        existing.updated_at ||
        t.updated_at ||
        new Date().toISOString(),
    });
  }

  // order by updatedAt desc
  const merged = Array.from(byId.values()).sort((a, b) => {
    const ta = parseTime(a.updatedAt || a.updated_at || a.createdAt || a.created_at);
    const tb = parseTime(b.updatedAt || b.updated_at || b.createdAt || b.created_at);
    return tb - ta;
  });

  return merged;
}

// ----------------- PAGE -----------------
export default function PreForge() {
  const { userId, accessToken } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(userId && accessToken);

  const initialLocal = useMemo(() => {
    const stored = loadLocal();
    if (stored) return ensureClientIds(stored);
    return ensureClientIds(makeSeedLocal());
  }, []);

  const [topics, setTopics] = useState(initialLocal.topics);
  const [deletedTopicClientIds, setDeletedTopicClientIds] = useState(
    initialLocal.deletedTopicClientIds || []
  );

  const [activeId, setActiveId] = useState(initialLocal.topics[0]?.client_id || null);

  // collapsible topics panel
  const [topicsOpen, setTopicsOpen] = useState(true);

  // tag filtering
  const [activeTag, setActiveTag] = useState("All");

  // create topic
  const [newTitle, setNewTitle] = useState("");
  const [newTagsDraft, setNewTagsDraft] = useState("");

  // add item
  const [draftKind, setDraftKind] = useState("question");
  const [draftText, setDraftText] = useState("");

  // tag editing
  const [tagDraft, setTagDraft] = useState("");

  // editing item
  const [editing, setEditing] = useState(null); // { topicClientId, itemClientId, kind }
  const [editingText, setEditingText] = useState("");

  // pinned draft (prevents “eating letters” by avoiding per-keystroke network)
  const [pinnedDraft, setPinnedDraft] = useState("");

  // sync status
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const activeTopic = useMemo(
    () => topics.find((t) => t.client_id === activeId) || null,
    [topics, activeId]
  );

  // Keep pinned draft in sync when switching topics
  useEffect(() => {
    setPinnedDraft(activeTopic?.pinned || "");
  }, [activeTopic?.client_id]);

  // Persist local on changes (including tombstones)
  useEffect(() => {
    saveLocal({ version: 3, topics, deletedTopicClientIds });
  }, [topics, deletedTopicClientIds]);

  const allTags = useMemo(() => {
    const tags = topics.flatMap((t) => (t.tags || []).map(normalizeTag).filter(Boolean));
    return ["All", ...uniq(tags).sort((a, b) => a.localeCompare(b))];
  }, [topics]);

  const filteredTopics = useMemo(() => {
    const tomb = new Set(deletedTopicClientIds || []);
    const visible = (topics || []).filter((t) => t?.client_id && !tomb.has(t.client_id));
    if (activeTag === "All") return visible;
    return visible.filter((t) => (t.tags || []).includes(activeTag));
  }, [topics, activeTag, deletedTopicClientIds]);

  // keep active selection valid under filter
  useEffect(() => {
    if (!filteredTopics.length) return;
    const stillVisible = filteredTopics.some((t) => t.client_id === activeId);
    if (!stillVisible) setActiveId(filteredTopics[0].client_id);
  }, [filteredTopics, activeId]);

  // ----------------- Local mutations -----------------
  const touchTopic = (t) => ({ ...t, updatedAt: new Date().toISOString() });

  const updateTopicLocal = (topicClientId, patch) => {
    setTopics((prev) =>
      prev.map((t) =>
        t.client_id === topicClientId ? touchTopic({ ...t, ...patch }) : t
      )
    );
  };

  const createTopicLocal = () => {
    const title = newTitle.trim();
    if (!title) return;

    const tags = newTagsDraft
      .split(",")
      .map((x) => normalizeTag(x))
      .filter(Boolean);

    const now = new Date().toISOString();
    const next = {
      client_id: safeUUID(),
      title,
      tags: uniq(tags),
      pinned: "",
      items: [],
      createdAt: now,
      updatedAt: now,
    };

    // if this id was previously deleted (rare), un-tombstone it
    setDeletedTopicClientIds((prev) => (prev || []).filter((cid) => cid !== next.client_id));

    setTopics((prev) => [next, ...prev]);
    setActiveId(next.client_id);
    setPinnedDraft("");

    if (tags.length) setActiveTag(tags[0]);
    else setActiveTag("All");

    setNewTitle("");
    setNewTagsDraft("");
    setDraftText("");
  };

  const deleteTopicLocal = (topicClientId) => {
    // keep local data out of view, but tombstone the client_id so server can't resurrect it
    setTopics((prev) => prev.filter((t) => t.client_id !== topicClientId));
    setDeletedTopicClientIds((prev) => uniq([...(prev || []), topicClientId]));

    if (activeId === topicClientId) {
      const remaining = (activeTag === "All"
        ? topics.filter((t) => t.client_id !== topicClientId)
        : topics.filter((t) => t.client_id !== topicClientId && (t.tags || []).includes(activeTag))
      );
      setActiveId(remaining?.[0]?.client_id ?? null);
    }
  };

  const addItemLocal = () => {
    if (!activeTopic) return;
    const text = draftText.trim();
    if (!text) return;

    const now = new Date().toISOString();
    const item = {
      client_id: safeUUID(),
      kind: draftKind,
      text,
      createdAt: now,
      updatedAt: now,
    };

    updateTopicLocal(activeTopic.client_id, {
      items: [item, ...(activeTopic.items || [])],
    });

    setDraftText("");
  };

  const deleteItemLocal = (itemClientId) => {
    if (!activeTopic) return;
    updateTopicLocal(activeTopic.client_id, {
      items: (activeTopic.items || []).filter((x) => x.client_id !== itemClientId),
    });
  };

  const pinItemLocal = (itemClientId) => {
    if (!activeTopic) return;
    const item = (activeTopic.items || []).find((x) => x.client_id === itemClientId);
    if (!item) return;
    setPinnedDraft(item.text);
    updateTopicLocal(activeTopic.client_id, { pinned: item.text });
  };

  const beginEdit = (item) => {
    if (!activeTopic) return;
    setEditing({
      topicClientId: activeTopic.client_id,
      itemClientId: item.client_id,
      kind: item.kind,
    });
    setEditingText(item.text || "");
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditingText("");
  };

  const saveEditLocal = () => {
    if (!editing) return;
    const t = editingText.trim();
    if (!t) return;

    setTopics((prev) =>
      prev.map((topic) => {
        if (topic.client_id !== editing.topicClientId) return topic;
        return touchTopic({
          ...topic,
          items: (topic.items || []).map((it) =>
            it.client_id === editing.itemClientId
              ? { ...it, text: t, updatedAt: new Date().toISOString() }
              : it
          ),
        });
      })
    );

    setEditing(null);
    setEditingText("");
  };

  const addTagToActiveLocal = () => {
    if (!activeTopic) return;
    const t = normalizeTag(tagDraft);
    if (!t) return;

    const nextTags = uniq([...(activeTopic.tags || []), t]);
    updateTopicLocal(activeTopic.client_id, { tags: nextTags });
    setTagDraft("");
  };

  const removeTagFromActiveLocal = (tag) => {
    if (!activeTopic) return;
    const name = normalizeTag(tag);
    const nextTags = (activeTopic.tags || []).filter((t) => t !== name);
    updateTopicLocal(activeTopic.client_id, { tags: nextTags });

    if (activeTag !== "All" && name === activeTag) setActiveTag("All");
  };

  const savePinnedLocal = () => {
    if (!activeTopic) return;
    updateTopicLocal(activeTopic.client_id, { pinned: pinnedDraft || "" });
    setSyncMsg("Pinned saved locally.");
    setTimeout(() => setSyncMsg(""), 1200);
  };

  // ----------------- Backend actions (MERGE, NOT OVERWRITE) -----------------
  const pullFromAccount = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    try {
      setSyncBusy(true);
      setSyncMsg("");

      const res = await api.get("/preforge/topics", { validateStatus: () => true });
      if (res.status === 200) {
        const serverTopicsRaw = Array.isArray(res.data) ? res.data : [];
        const serverTopicsLocal = serverTopicsRaw.map(serverToLocalTopic);

        // ✅ merge, don't overwrite
        const merged = mergeTopics(topics, serverTopicsLocal, deletedTopicClientIds);

        setTopics(merged);

        // keep active if possible
        const still = merged.find((t) => t.client_id === activeId);
        const nextActive = still?.client_id ?? merged?.[0]?.client_id ?? null;
        setActiveId(nextActive);
        setPinnedDraft(merged.find((t) => t.client_id === nextActive)?.pinned ?? "");

        setActiveTag("All");
        setSyncMsg("Pulled and merged from your account.");
        return;
      }

      if (res.status === 401) {
        setSyncMsg("Login expired. Please log in again.");
        return;
      }

      setSyncMsg(`Pull failed (status ${res.status}).`);
    } catch (e) {
      console.error(e);
      setSyncMsg("Pull failed.");
    } finally {
      setSyncBusy(false);
      setTimeout(() => setSyncMsg(""), 2500);
    }
  };

  const syncToAccount = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    try {
      setSyncBusy(true);
      setSyncMsg("");

      const payload = localToSyncPayload(topics, deletedTopicClientIds);

      const res = await api.post("/preforge/sync", payload, { validateStatus: () => true });

      if (res.status === 200) {
        const serverTopicsRaw = Array.isArray(res.data) ? res.data : [];
        const serverTopicsLocal = serverTopicsRaw.map(serverToLocalTopic);

        // ✅ merge server truth back into local (but still respect tombstones)
        const merged = mergeTopics(topics, serverTopicsLocal, deletedTopicClientIds);

        setTopics(merged);

        // ✅ clear tombstones that the server has accepted (i.e., server doesn't return them)
        const serverIds = new Set(serverTopicsLocal.map((t) => t.client_id));
        setDeletedTopicClientIds((prev) => (prev || []).filter((cid) => serverIds.has(cid) === false ? true : false));
        // The above line keeps tombstones that aren't in serverIds (meaning deleted on server or never existed there).
        // BUT if you want to clear tombstones ONLY after server has confirmed deletion:
        // - the server will not return them -> they won't be in serverIds
        // - so we can safely KEEP them (prevents resurrection later)
        // In practice, KEEPING tombstones is safest. If you want to prune, do it manually later.

        const still = merged.find((t) => t.client_id === activeId);
        const nextActive = still?.client_id ?? merged?.[0]?.client_id ?? null;
        setActiveId(nextActive);
        setPinnedDraft(merged.find((t) => t.client_id === nextActive)?.pinned ?? "");

        setSyncMsg("Synced to your account.");
        return;
      }

      if (res.status === 401) {
        setSyncMsg("Login expired. Please log in again.");
        return;
      }

      const msg = res.data?.detail || `Sync failed (status ${res.status}).`;
      setSyncMsg(String(msg));
    } catch (e) {
      console.error(e);
      setSyncMsg("Sync failed.");
    } finally {
      setSyncBusy(false);
      setTimeout(() => setSyncMsg(""), 2500);
    }
  };

  // ----------------- Render -----------------
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Pre-Forge</h1>
            <p className="text-sm text-[var(--muted)]">
              Local-first. Name the thing, frame it cleanly, and think in smaller pieces.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {allTags.map((t) => (
                <ChipButton key={t} active={activeTag === t} onClick={() => setActiveTag(t)}>
                  {t === "All" ? "All" : `#${t}`}
                </ChipButton>
              ))}
              {allTags.length === 1 ? (
                <span className="text-xs text-[var(--muted)] ml-2">
                  Add tags on topics to see filters.
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            >
              ← Home
            </Link>

            {isLoggedIn ? (
              <>
                <SmallButton onClick={syncToAccount} disabled={syncBusy}>
                  {syncBusy ? "Syncing…" : "Sync to account"}
                </SmallButton>
                <SmallButton variant="ghost" onClick={pullFromAccount} disabled={syncBusy}>
                  Pull (merge)
                </SmallButton>
              </>
            ) : (
              <SmallButton onClick={() => navigate("/login")}>Login to sync</SmallButton>
            )}
          </div>
        </header>

        {syncMsg ? <div className="mt-4 text-xs text-[var(--muted)]">{syncMsg}</div> : null}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
          {/* LEFT: topic list */}
          <CardShell
            title="Topics"
            subtitle="Local-first. Collapse this when you’re focused."
            right={
              <SmallButton variant="ghost" onClick={() => setTopicsOpen((v) => !v)}>
                {topicsOpen ? "Collapse" : "Expand"}
              </SmallButton>
            }
          >
            {!topicsOpen ? (
              <div className="text-xs text-[var(--muted)]">
                Topics collapsed. Use the button above to open.
              </div>
            ) : (
              <div className="space-y-3">
                <TextInput
                  value={newTitle}
                  onChange={setNewTitle}
                  placeholder='Topic title… (e.g., "Journal")'
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      createTopicLocal();
                    }
                  }}
                />
                <TextInput
                  value={newTagsDraft}
                  onChange={setNewTagsDraft}
                  placeholder='Tags (comma-separated)… e.g., PneumEvolve, Relationship'
                />
                <div className="flex gap-2">
                  <SmallButton onClick={createTopicLocal}>Add topic</SmallButton>
                  <SmallButton variant="ghost" onClick={() => { setNewTitle(""); setNewTagsDraft(""); }}>
                    Clear
                  </SmallButton>
                </div>

                <div className="pt-2 space-y-2">
                  {filteredTopics.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">
                      No topics under {activeTag === "All" ? "All" : `#${activeTag}`}.
                    </p>
                  ) : (
                    filteredTopics.map((t) => {
                      const isActive = t.client_id === activeId;
                      return (
                        <button
                          key={t.client_id}
                          type="button"
                          onClick={() => setActiveId(t.client_id)}
                          className={`w-full text-left rounded-2xl border px-4 py-3 shadow-sm transition
                            border-[var(--border)] bg-[var(--bg)]
                            ${isActive ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[var(--text)] truncate">
                                {t.title || "Untitled"}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {(t.tags || []).length ? (
                                  t.tags.slice(0, 4).map((tg) => <Pill key={tg}>#{tg}</Pill>)
                                ) : (
                                  <span className="text-[11px] text-[var(--muted)]">No tags</span>
                                )}
                                {(t.tags || []).length > 4 ? (
                                  <span className="text-[11px] text-[var(--muted)]">
                                    +{t.tags.length - 4}
                                  </span>
                                ) : null}
                              </div>

                              <p className="mt-2 text-xs text-[var(--muted)] line-clamp-2">
                                {t.pinned ? `Pinned: ${t.pinned}` : "No pinned framing yet."}
                              </p>

                              <p className="mt-2 text-[11px] text-[var(--muted)]">
                                {(t.items || []).length} item(s)
                              </p>
                            </div>

                            <span className="text-[11px] text-[var(--muted)]">
                              {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="pt-4 text-[11px] text-[var(--muted)]">
                  Tip: delete topics stays deleted via tombstones (won’t resurrect on sync/pull).
                </div>
              </div>
            )}
          </CardShell>

          {/* RIGHT: active topic */}
          <div className="space-y-4">
            {!activeTopic ? (
              <CardShell title="No topic selected" subtitle="Create a topic on the left.">
                <p className="text-sm text-[var(--muted)] leading-6">
                  Start with one topic. Tag it. Then write one true question you can’t stop thinking about.
                </p>
              </CardShell>
            ) : (
              <>
                <CardShell title="The topic" subtitle="Title + tags + pinned framing.">
                  <label className="block text-xs text-[var(--muted)]">Title</label>
                  <TextInput
                    value={activeTopic.title || ""}
                    onChange={(v) => updateTopicLocal(activeTopic.client_id, { title: v })}
                    placeholder="Topic title…"
                  />

                  <div className="mt-4">
                    <label className="block text-xs text-[var(--muted)]">Tags</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(activeTopic.tags || []).length ? (
                        activeTopic.tags.map((tg) => (
                          <TagPill
                            key={tg}
                            text={`#${tg}`}
                            onRemove={() => removeTagFromActiveLocal(tg)}
                          />
                        ))
                      ) : (
                        <span className="text-xs text-[var(--muted)]">No tags yet.</span>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <TextInput
                        value={tagDraft}
                        onChange={setTagDraft}
                        placeholder='Add a tag… e.g., PneumEvolve'
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTagToActiveLocal();
                          }
                        }}
                      />
                      <SmallButton onClick={addTagToActiveLocal}>Add</SmallButton>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs text-[var(--muted)]">
                      Pinned (best current framing)
                    </label>

                    <TextArea
                      value={pinnedDraft}
                      onChange={setPinnedDraft}
                      rows={3}
                      placeholder='Example: "What do I want this to become?"'
                    />

                    <div className="mt-2 flex gap-2">
                      <SmallButton onClick={savePinnedLocal}>Save pinned</SmallButton>
                      <SmallButton variant="ghost" onClick={() => setPinnedDraft(activeTopic.pinned || "")}>
                        Revert
                      </SmallButton>
                    </div>

                    <p className="mt-2 text-[11px] text-[var(--muted)]">
                      Saved locally. Sync pushes it to your account.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <SmallButton variant="ghost" onClick={() => deleteTopicLocal(activeTopic.client_id)}>
                      Delete topic
                    </SmallButton>
                  </div>
                </CardShell>

                <CardShell title="Add a note or question" subtitle="Questions narrow. Notes unload.">
                  <div className="flex flex-wrap items-center gap-2">
                    <SmallButton
                      variant={draftKind === "question" ? "default" : "ghost"}
                      onClick={() => setDraftKind("question")}
                    >
                      Question
                    </SmallButton>
                    <SmallButton
                      variant={draftKind === "note" ? "default" : "ghost"}
                      onClick={() => setDraftKind("note")}
                    >
                      Note
                    </SmallButton>
                    <span className="text-[11px] text-[var(--muted)]">Pick one. Keep it small.</span>
                  </div>

                  <div className="mt-3 space-y-2">
                    <TextArea
                      value={draftText}
                      onChange={setDraftText}
                      rows={4}
                      placeholder={
                        draftKind === "question"
                          ? 'Example: "What is the smallest next step?"'
                          : 'Example: "I feel pressure to make it impressive."'
                      }
                    />
                    <div className="flex gap-2">
                      <SmallButton onClick={addItemLocal}>Add</SmallButton>
                      <SmallButton variant="ghost" onClick={() => setDraftText("")}>
                        Clear
                      </SmallButton>
                    </div>
                  </div>
                </CardShell>

                <CardShell title="All items" subtitle="Pin the best one when it clicks.">
                  {editing ? (
                    <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Pill>{editing.kind === "question" ? "Question" : "Note"}</Pill>
                          <span className="text-xs text-[var(--muted)]">Editing</span>
                        </div>
                        <div className="flex gap-2">
                          <SmallButton onClick={saveEditLocal}>Save</SmallButton>
                          <SmallButton variant="ghost" onClick={cancelEdit}>
                            Cancel
                          </SmallButton>
                        </div>
                      </div>

                      <div className="mt-3">
                        <TextArea
                          value={editingText}
                          onChange={setEditingText}
                          rows={5}
                          placeholder="Edit text…"
                        />
                        <p className="mt-2 text-[11px] text-[var(--muted)]">
                          Make it truer, not “better.”
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {(activeTopic.items || []).length === 0 ? (
                      <p className="text-xs text-[var(--muted)]">
                        Nothing yet. Add one question you actually care about.
                      </p>
                    ) : (
                      (activeTopic.items || []).map((item) => (
                        <NoteRow
                          key={item.client_id}
                          item={item}
                          onPin={() => pinItemLocal(item.client_id)}
                          onDelete={() => deleteItemLocal(item.client_id)}
                          onEdit={() => beginEdit(item)}
                        />
                      ))
                    )}
                  </div>
                </CardShell>
              </>
            )}
          </div>
        </div>

        <footer className="mt-8 text-xs text-[var(--muted)]">
          Local-first. Tombstones prevent deleted topics from resurrecting on pull/sync.
        </footer>
      </div>
    </main>
  );
}