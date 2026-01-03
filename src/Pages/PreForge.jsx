// src/Pages/PreForge.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// ---------- Small UI helpers ----------
function CardShell({ title, subtitle, children, rightSlot }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle ? <p className="text-xs text-[var(--muted)]">{subtitle}</p> : null}
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
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
  const created = item?.created_at || item?.createdAt || null;
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

function normalizeTag(s) {
  return (s || "").trim().replace(/\s+/g, " ").replace(/^#/, "");
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

// ---------- Main page ----------
export default function PreForge() {
  const { userId, accessToken } = useAuth();
  const navigate = useNavigate();

  const [topics, setTopics] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // tag filtering
  const [activeTag, setActiveTag] = useState("All");

  // create topic
  const [newTitle, setNewTitle] = useState("");
  const [newTagsDraft, setNewTagsDraft] = useState("");

  // add item
  const [draftKind, setDraftKind] = useState("question"); // "note" | "question"
  const [draftText, setDraftText] = useState("");

  // tag editing (active topic)
  const [tagDraft, setTagDraft] = useState("");

  // editing item
  const [editing, setEditing] = useState(null); // { topicId, itemId, kind }
  const [editingText, setEditingText] = useState("");

  // pinned draft (local typing, click-to-save)
  const [pinnedDraft, setPinnedDraft] = useState("");
  const [pinnedDirty, setPinnedDirty] = useState(false);
  const [pinnedSaving, setPinnedSaving] = useState(false);

  // collapsible topics panel
  const [topicsOpen, setTopicsOpen] = useState(true);

  // load state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const activeTopic = useMemo(
    () => topics.find((t) => t.id === activeId) || null,
    [topics, activeId]
  );

  // Keep pinned draft in sync when switching topics (ONLY on id change)
  useEffect(() => {
    setPinnedDraft(activeTopic?.pinned || "");
    setPinnedDirty(false);
    setPinnedSaving(false);
  }, [activeTopic?.id]);

  const allTags = useMemo(() => {
    const tags = topics.flatMap((t) => (t.tags || []).map(normalizeTag).filter(Boolean));
    return ["All", ...uniq(tags).sort((a, b) => a.localeCompare(b))];
  }, [topics]);

  const filteredTopics = useMemo(() => {
    if (activeTag === "All") return topics;
    return topics.filter((t) => (t.tags || []).includes(activeTag));
  }, [topics, activeTag]);

  // keep active selection valid under filter
  useEffect(() => {
    if (!filteredTopics.length) return;
    const stillVisible = filteredTopics.some((t) => t.id === activeId);
    if (!stillVisible) setActiveId(filteredTopics[0].id);
  }, [filteredTopics, activeId]);

  const fetchTopics = async () => {
    try {
      setError("");
      setShowLogin(false);
      setLoading(true);

      const res = await api.get("/preforge/topics", { validateStatus: () => true });
      console.log("[/preforge/topics] status:", res.status, "data:", res.data);

      if (res.status === 200) {
        const data = Array.isArray(res.data) ? res.data : [];
        setTopics(data);
        setActiveId((prev) => prev ?? data?.[0]?.id ?? null);
        return;
      }

      if (res.status === 401) {
        setShowLogin(true);
        setTopics([]);
        setActiveId(null);
        return;
      }

      setError(`Unexpected status ${res.status}`);
    } catch (e) {
      console.error("Failed to fetch preforge topics:", e);
      setError("Failed to load topics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [userId, accessToken]);

  const createTopic = async () => {
    const title = newTitle.trim();
    if (!title) return;

    const tags = newTagsDraft.split(",").map(normalizeTag).filter(Boolean);

    try {
      const res = await api.post("/preforge/topics", { title, pinned: "", tags });
      const created = res.data;
      setTopics((prev) => [created, ...prev]);
      setActiveId(created.id);

      if (tags.length) setActiveTag(tags[0]);
      else setActiveTag("All");

      setNewTitle("");
      setNewTagsDraft("");
      setDraftText("");

      // after creating, keep list visible so you can see it
      setTopicsOpen(true);
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Failed";
      alert(`Create topic failed: ${msg}`);
    }
  };

  const updateTopic = async (topicId, patch) => {
    try {
      const res = await api.put(`/preforge/topics/${topicId}`, patch);
      const updated = res.data;
      setTopics((prev) => prev.map((t) => (t.id === topicId ? updated : t)));
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Failed";
      alert(`Update failed: ${msg}`);
    }
  };

  const deleteTopic = async (topicId) => {
    try {
      await api.delete(`/preforge/topics/${topicId}`);
      setTopics((prev) => prev.filter((t) => t.id !== topicId));

      if (activeId === topicId) {
        const remaining = (activeTag === "All"
          ? topics.filter((t) => t.id !== topicId)
          : topics.filter((t) => t.id !== topicId && (t.tags || []).includes(activeTag))
        );
        setActiveId(remaining?.[0]?.id ?? null);
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Failed";
      alert(`Delete failed: ${msg}`);
    }
  };

  const addItem = async () => {
    if (!activeTopic) return;
    const text = draftText.trim();
    if (!text) return;

    try {
      const res = await api.post(`/preforge/topics/${activeTopic.id}/items`, {
        kind: draftKind,
        text,
      });

      const createdItem = res.data;
      setTopics((prev) =>
        prev.map((t) =>
          t.id === activeTopic.id
            ? { ...t, items: [createdItem, ...(t.items || [])] }
            : t
        )
      );
      setDraftText("");
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Failed";
      alert(`Add item failed: ${msg}`);
    }
  };

  const beginEdit = (item) => {
    if (!activeTopic) return;
    setEditing({ topicId: activeTopic.id, itemId: item.id, kind: item.kind });
    setEditingText(item.text || "");
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditingText("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    const t = editingText.trim();
    if (!t) return;

    try {
      const res = await api.put(`/preforge/items/${editing.itemId}`, {
        kind: editing.kind,
        text: t,
      });

      const updatedItem = res.data;
      setTopics((prev) =>
        prev.map((topic) => {
          if (topic.id !== editing.topicId) return topic;
          return {
            ...topic,
            items: (topic.items || []).map((it) => (it.id === updatedItem.id ? updatedItem : it)),
          };
        })
      );

      setEditing(null);
      setEditingText("");
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Failed";
      alert(`Save failed: ${msg}`);
    }
  };

  const deleteItem = async (itemId) => {
    if (!activeTopic) return;
    try {
      await api.delete(`/preforge/items/${itemId}`);
      setTopics((prev) =>
        prev.map((t) =>
          t.id === activeTopic.id
            ? { ...t, items: (t.items || []).filter((x) => x.id !== itemId) }
            : t
        )
      );
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Failed";
      alert(`Delete failed: ${msg}`);
    }
  };

  const pinItem = (itemId) => {
    if (!activeTopic) return;
    const item = (activeTopic.items || []).find((x) => x.id === itemId);
    if (!item) return;

    setPinnedDraft(item.text || "");
    setPinnedDirty(true);
  };

  // --- Tags ---
  const addTagToActive = async () => {
    if (!activeTopic) return;
    const t = normalizeTag(tagDraft);
    if (!t) return;

    try {
      await api.post(`/preforge/topics/${activeTopic.id}/tags`, null, { params: { tag: t } });
      await fetchTopics();
      setTagDraft("");
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Failed";
      alert(`Add tag failed: ${msg}`);
    }
  };

  const removeTagFromActive = async (tag) => {
    if (!activeTopic) return;
    const name = normalizeTag(tag);

    try {
      await api.delete(`/preforge/topics/${activeTopic.id}/tags/${encodeURIComponent(name)}`);
      await fetchTopics();
      if (activeTag !== "All" && name === activeTag) setActiveTag("All");
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Failed";
      alert(`Remove tag failed: ${msg}`);
    }
  };

  const savePinned = async () => {
    if (!activeTopic) return;
    setPinnedSaving(true);
    try {
      const res = await api.put(`/preforge/topics/${activeTopic.id}`, { pinned: pinnedDraft });
      const updated = res.data;
      setTopics((prev) => prev.map((t) => (t.id === activeTopic.id ? updated : t)));
      setPinnedDirty(false);
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Failed";
      alert(`Save pinned failed: ${msg}`);
    } finally {
      setPinnedSaving(false);
    }
  };

  const cancelPinned = () => {
    setPinnedDraft(activeTopic?.pinned || "");
    setPinnedDirty(false);
  };

  // collapse topics on select (mobile/tablet)
  const selectTopic = (id) => {
    setActiveId(id);
    if (window.innerWidth < 1024) setTopicsOpen(false); // auto-collapse under lg
  };

  // ---------- Render ----------
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Pre-Forge</h1>
            <p className="text-sm text-[var(--muted)]">
              A place to name the thing, frame it cleanly, and think in smaller pieces.
            </p>

            {/* Tag Filter Bar */}
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

          <div className="flex flex-wrap gap-2">
            <Link
              to="/"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            >
              ← Home
            </Link>
          </div>
        </header>

        {loading ? <div className="mt-6 text-sm text-[var(--muted)]">Loading…</div> : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 text-sm">
            <div className="font-semibold">Error</div>
            <div className="mt-1 text-[var(--muted)]">{error}</div>
            <div className="mt-3 flex gap-2">
              <SmallButton onClick={fetchTopics}>Retry</SmallButton>
            </div>
          </div>
        ) : null}

        {showLogin ? (
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5">
            <div className="text-sm font-semibold">Login required</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Pre-Forge is tied to your account. Please log in.
            </p>
            <div className="mt-3 flex gap-2">
              <SmallButton onClick={() => navigate("/login")}>Go to login</SmallButton>
              <SmallButton variant="ghost" onClick={fetchTopics}>
                I already logged in
              </SmallButton>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
          {/* LEFT: topic list (collapsible) */}
          <CardShell
            title="Topics"
            subtitle="Title = the thing. Tag = the bucket."
            rightSlot={
              <SmallButton
                variant="ghost"
                onClick={() => setTopicsOpen((v) => !v)}
                disabled={false}
              >
                {topicsOpen ? "Collapse" : "Expand"}
              </SmallButton>
            }
          >
            {!topicsOpen ? (
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="font-semibold">{activeTopic?.title || "No topic selected"}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {(activeTopic?.items || []).length} item(s)
                    {activeTopic?.pinned ? " • has pinned framing" : ""}
                  </div>
                </div>
                <SmallButton variant="ghost" onClick={() => setTopicsOpen(true)}>
                  Show list
                </SmallButton>
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
                      createTopic();
                    }
                  }}
                  disabled={showLogin}
                />
                <TextInput
                  value={newTagsDraft}
                  onChange={setNewTagsDraft}
                  placeholder='Tags (comma-separated)… e.g., PneumEvolve, Relationship'
                  disabled={showLogin}
                />
                <div className="flex gap-2">
                  <SmallButton onClick={createTopic} disabled={showLogin}>
                    Add topic
                  </SmallButton>
                  <SmallButton
                    variant="ghost"
                    onClick={() => {
                      setNewTitle("");
                      setNewTagsDraft("");
                    }}
                    disabled={showLogin}
                  >
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
                      const isActive = t.id === activeId;
                      const updated = t.updated_at || t.updatedAt || null;

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => selectTopic(t.id)}
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
                              {updated ? new Date(updated).toLocaleDateString() : ""}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="pt-4 text-[11px] text-[var(--muted)]">
                  Tip: On mobile, picking a topic auto-collapses this list.
                </div>
              </div>
            )}
          </CardShell>

          {/* RIGHT: active topic */}
          <div className="space-y-4">
            {!activeTopic ? (
              <CardShell title="No topic selected" subtitle="Create a topic on the left.">
                <p className="text-sm text-[var(--muted)] leading-6">
                  Start with one topic. Tag it. Then write one true question you can’t stop thinking
                  about.
                </p>
              </CardShell>
            ) : (
              <>
                <CardShell title="The topic" subtitle="Title + tags + pinned framing.">
                  <label className="block text-xs text-[var(--muted)]">Title</label>
                  <TextInput
                    value={activeTopic.title || ""}
                    onChange={(v) => updateTopic(activeTopic.id, { title: v })}
                    placeholder="Topic title…"
                    disabled={showLogin}
                  />

                  <div className="mt-4">
                    <label className="block text-xs text-[var(--muted)]">Tags</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(activeTopic.tags || []).length ? (
                        activeTopic.tags.map((tg) => (
                          <TagPill
                            key={tg}
                            text={`#${tg}`}
                            onRemove={showLogin ? null : () => removeTagFromActive(tg)}
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
                            addTagToActive();
                          }
                        }}
                        disabled={showLogin}
                      />
                      <SmallButton onClick={addTagToActive} disabled={showLogin}>
                        Add
                      </SmallButton>
                    </div>
                    <p className="mt-2 text-[11px] text-[var(--muted)]">
                      Tags update via API. (Backend expects <code>tag</code> as a query param.)
                    </p>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs text-[var(--muted)]">
                      Pinned (best current framing)
                    </label>

                    <TextArea
                      value={pinnedDraft}
                      onChange={(v) => {
                        setPinnedDraft(v);
                        setPinnedDirty(true);
                      }}
                      rows={3}
                      placeholder='Example: "What do I want this to become?"'
                      disabled={showLogin}
                    />

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <SmallButton
                        onClick={savePinned}
                        disabled={showLogin || pinnedSaving || !pinnedDirty}
                      >
                        {pinnedSaving ? "Saving..." : "Save pinned"}
                      </SmallButton>

                      <SmallButton
                        variant="ghost"
                        onClick={cancelPinned}
                        disabled={showLogin || pinnedSaving || !pinnedDirty}
                      >
                        Cancel
                      </SmallButton>

                      {!pinnedDirty ? (
                        <span className="text-[11px] text-[var(--muted)]">Saved</span>
                      ) : (
                        <span className="text-[11px] text-[var(--muted)]">Unsaved changes</span>
                      )}
                    </div>

                    <p className="mt-2 text-[11px] text-[var(--muted)]">
                      This is the sentence you keep returning to.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <SmallButton
                      variant="ghost"
                      onClick={() => deleteTopic(activeTopic.id)}
                      disabled={showLogin}
                    >
                      Delete topic
                    </SmallButton>
                  </div>
                </CardShell>

                <CardShell title="Add a note or question" subtitle="Questions narrow. Notes unload.">
                  <div className="flex flex-wrap items-center gap-2">
                    <SmallButton
                      variant={draftKind === "question" ? "default" : "ghost"}
                      onClick={() => setDraftKind("question")}
                      disabled={showLogin}
                    >
                      Question
                    </SmallButton>
                    <SmallButton
                      variant={draftKind === "note" ? "default" : "ghost"}
                      onClick={() => setDraftKind("note")}
                      disabled={showLogin}
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
                      disabled={showLogin}
                      placeholder={
                        draftKind === "question"
                          ? 'Example: "What is the smallest next step?"'
                          : 'Example: "I feel pressure to make it impressive."'
                      }
                    />
                    <div className="flex gap-2">
                      <SmallButton onClick={addItem} disabled={showLogin}>
                        Add
                      </SmallButton>
                      <SmallButton
                        variant="ghost"
                        onClick={() => setDraftText("")}
                        disabled={showLogin}
                      >
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
                          <SmallButton onClick={saveEdit} disabled={showLogin}>
                            Save
                          </SmallButton>
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
                          disabled={showLogin}
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
                          key={item.id}
                          item={item}
                          onPin={() => pinItem(item.id)}
                          onDelete={() => deleteItem(item.id)}
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
          API-backed (auth required). If you get 401s, check cookies + refresh token flow.
        </footer>
      </div>
    </main>
  );
}