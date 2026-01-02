// src/Pages/PreForgeLocal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Pre-Forge (Local) — tiny "clarify the problem" scratchpad
 * - LocalStorage only
 * - Cards = topics (ex: Journal)
 * - Tags organize topics (ex: PneumEvolve)
 * - Top tag bar filters the topic list
 */

const LS_KEY = "pe_pre_forge_local_v2";

function safeUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(next) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function nowISO() {
  return new Date().toISOString();
}

function normalizeTag(s) {
  return (s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^#/, "");
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function CardShell({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle ? <p className="text-xs text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      <div className="mt-3 text-sm leading-6 text-[var(--muted)]">{children}</div>
    </section>
  );
}

function SmallButton({ children, onClick, type = "button", variant = "default" }) {
  const base =
    "rounded-xl border px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition";
  const styles =
    variant === "ghost"
      ? "border-[var(--border)] bg-[var(--bg)]"
      : "border-[var(--border)] bg-[var(--bg-elev)]";
  return (
    <button type={type} onClick={onClick} className={`${base} ${styles}`}>
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
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs text-[var(--muted)]">
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

function TextInput({ value, onChange, placeholder, onKeyDown }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
      placeholder={placeholder}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
      placeholder={placeholder}
    />
  );
}

function NoteRow({ item, onPin, onDelete, onEdit }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>{item.kind === "question" ? "Question" : "Note"}</Pill>
            <span className="text-[11px] text-[var(--muted)]">
              {new Date(item.createdAt).toLocaleString()}
            </span>
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

export default function PreForgeLocal() {
  const initial = useMemo(() => {
    const stored = loadState();
    if (stored?.cards?.length) return stored;

    // Example: Tag "PneumEvolve" contains topic "Journal"
    const journal = {
      id: safeUUID(),
      title: "Journal",
      tags: ["PneumEvolve"],
      pinned: "What would make journaling actually usable when I feel low?",
      items: [
        {
          id: safeUUID(),
          kind: "note",
          text: "I want it to feel like a safe landing, not homework.",
          createdAt: nowISO(),
        },
        {
          id: safeUUID(),
          kind: "question",
          text: "What is the smallest journaling action that still creates momentum?",
          createdAt: nowISO(),
        },
      ],
      updatedAt: nowISO(),
    };

    return { version: 2, cards: [journal] };
  }, []);

  const [cards, setCards] = useState(initial.cards);
  const [activeId, setActiveId] = useState(initial.cards[0]?.id || null);

  // tag filter
  const [activeTag, setActiveTag] = useState("All");

  // Add-topic draft
  const [newTitle, setNewTitle] = useState("");
  const [newTagsDraft, setNewTagsDraft] = useState(""); // comma-separated tags

  // New item draft
  const [draftKind, setDraftKind] = useState("question"); // "note" | "question"
  const [draftText, setDraftText] = useState("");

  // Tag editor for active card
  const [tagDraft, setTagDraft] = useState("");

  // Edit item state
  const [editing, setEditing] = useState(null); // { cardId, itemId, text, kind }
  const [editingText, setEditingText] = useState("");

  const allTags = useMemo(() => {
    const tags = cards.flatMap((c) => (c.tags || []).map(normalizeTag).filter(Boolean));
    return ["All", ...uniq(tags).sort((a, b) => a.localeCompare(b))];
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (activeTag === "All") return cards;
    return cards.filter((c) => (c.tags || []).includes(activeTag));
  }, [cards, activeTag]);

  const activeCard = useMemo(
    () => cards.find((c) => c.id === activeId) || null,
    [cards, activeId]
  );

  // If filter hides the active card, pick the first visible one
  useEffect(() => {
    if (!filteredCards.length) return;
    const stillVisible = filteredCards.some((c) => c.id === activeId);
    if (!stillVisible) setActiveId(filteredCards[0].id);
  }, [activeTag, filteredCards, activeId]);

  useEffect(() => {
    saveState({ version: 2, cards });
  }, [cards]);

  const updateCard = (cardId, patch) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, ...patch, updatedAt: nowISO() } : c
      )
    );
  };

  const createCard = () => {
    const t = newTitle.trim();
    if (!t) return;

    const tags = newTagsDraft
      .split(",")
      .map((x) => normalizeTag(x))
      .filter(Boolean);

    const next = {
      id: safeUUID(),
      title: t,
      tags: uniq(tags),
      pinned: "",
      items: [],
      updatedAt: nowISO(),
    };

    setCards((prev) => [next, ...prev]);
    setActiveId(next.id);

    // If they made a new tag, snap filter to it (nice UX)
    if (tags.length) setActiveTag(tags[0]);
    else setActiveTag("All");

    setNewTitle("");
    setNewTagsDraft("");
    setDraftText("");
  };

  const deleteCard = (cardId) => {
    const remaining = cards.filter((c) => c.id !== cardId);
    setCards(remaining);

    if (activeId === cardId) {
      const nextActive =
        (activeTag === "All"
          ? remaining
          : remaining.filter((c) => (c.tags || []).includes(activeTag)))?.[0]?.id || null;
      setActiveId(nextActive);
    }
  };

  const addItem = () => {
    if (!activeCard) return;
    const text = draftText.trim();
    if (!text) return;

    const item = {
      id: safeUUID(),
      kind: draftKind,
      text,
      createdAt: nowISO(),
    };

    updateCard(activeCard.id, { items: [item, ...(activeCard.items || [])] });
    setDraftText("");
  };

  const deleteItem = (itemId) => {
    if (!activeCard) return;
    updateCard(activeCard.id, {
      items: (activeCard.items || []).filter((x) => x.id !== itemId),
    });
  };

  const pinItem = (itemId) => {
    if (!activeCard) return;
    const item = (activeCard.items || []).find((x) => x.id === itemId);
    if (!item) return;
    updateCard(activeCard.id, { pinned: item.text });
  };

  const beginEdit = (item) => {
    setEditing({ cardId: activeCard.id, itemId: item.id, kind: item.kind, text: item.text });
    setEditingText(item.text);
  };

  const saveEdit = () => {
    if (!editing || !activeCard) return;
    const t = editingText.trim();
    if (!t) return;

    const nextItems = (activeCard.items || []).map((x) =>
      x.id === editing.itemId ? { ...x, text: t } : x
    );

    updateCard(activeCard.id, { items: nextItems });
    setEditing(null);
    setEditingText("");
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditingText("");
  };

  const addTagToActive = () => {
    if (!activeCard) return;
    const t = normalizeTag(tagDraft);
    if (!t) return;

    const nextTags = uniq([...(activeCard.tags || []), t]);
    updateCard(activeCard.id, { tags: nextTags });
    setTagDraft("");
  };

  const removeTagFromActive = (tag) => {
    if (!activeCard) return;
    const nextTags = (activeCard.tags || []).filter((t) => t !== tag);
    updateCard(activeCard.id, { tags: nextTags });

    // If you remove the tag you’re currently filtering on and it would hide this card, pop back to All.
    if (activeTag !== "All" && tag === activeTag) {
      setActiveTag("All");
    }
  };

  const resetEverything = () => {
    localStorage.removeItem(LS_KEY);
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Pre-Forge (local)
            </h1>
            <p className="text-sm text-[var(--muted)]">
              Tag your topics. Filter fast. Clarify one thing at a time.
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
                  Add a tag on a topic to see filters here.
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
            <SmallButton variant="ghost" onClick={resetEverything}>
              Reset local data
            </SmallButton>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
          {/* LEFT: Topic list */}
          <CardShell title="Topics" subtitle="Title = the thing. Tag = the bucket.">
            <div className="space-y-3">
              <TextInput
                value={newTitle}
                onChange={setNewTitle}
                placeholder='Topic title… (e.g., "Journal")'
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    createCard();
                  }
                }}
              />
              <TextInput
                value={newTagsDraft}
                onChange={setNewTagsDraft}
                placeholder='Tags (comma-separated)… e.g., PneumEvolve, Relationship'
              />
              <div className="flex gap-2">
                <SmallButton onClick={createCard}>Add topic</SmallButton>
                <SmallButton variant="ghost" onClick={() => { setNewTitle(""); setNewTagsDraft(""); }}>
                  Clear
                </SmallButton>
              </div>

              <div className="space-y-2">
                {filteredCards.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">
                    No topics under {activeTag === "All" ? "All" : `#${activeTag}`}.
                  </p>
                ) : (
                  filteredCards.map((c) => {
                    const isActive = c.id === activeId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveId(c.id)}
                        className={`w-full text-left rounded-2xl border px-4 py-3 shadow-sm transition
                          border-[var(--border)] bg-[var(--bg)]
                          ${isActive ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--text)] truncate">
                              {c.title || "Untitled"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(c.tags || []).length ? (
                                c.tags.slice(0, 4).map((t) => <Pill key={t}>#{t}</Pill>)
                              ) : (
                                <span className="text-[11px] text-[var(--muted)]">No tags</span>
                              )}
                              {(c.tags || []).length > 4 ? (
                                <span className="text-[11px] text-[var(--muted)]">
                                  +{c.tags.length - 4}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-xs text-[var(--muted)] line-clamp-2">
                              {c.pinned ? `Pinned: ${c.pinned}` : "No pinned framing yet."}
                            </p>
                            <p className="mt-2 text-[11px] text-[var(--muted)]">
                              {(c.items || []).length} item(s)
                            </p>
                          </div>
                          <span className="text-[11px] text-[var(--muted)]">
                            {new Date(c.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </CardShell>

          {/* RIGHT: Active topic */}
          <div className="space-y-4">
            {!activeCard ? (
              <CardShell title="No topic selected" subtitle="Create a topic on the left.">
                <p>Start with one topic. Tag it. Then write one true question.</p>
              </CardShell>
            ) : (
              <>
                <CardShell title="The topic" subtitle="Title + tags + pinned framing.">
                  <label className="block text-xs text-[var(--muted)]">Title</label>
                  <TextInput
                    value={activeCard.title}
                    onChange={(v) => updateCard(activeCard.id, { title: v })}
                    placeholder="Topic title…"
                  />

                  <div className="mt-4">
                    <label className="block text-xs text-[var(--muted)]">Tags</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(activeCard.tags || []).length ? (
                        activeCard.tags.map((t) => (
                          <TagPill key={t} text={`#${t}`} onRemove={() => removeTagFromActive(t)} />
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
                      />
                      <SmallButton onClick={addTagToActive}>Add</SmallButton>
                    </div>

                    <p className="mt-2 text-[11px] text-[var(--muted)]">
                      Use tags like buckets: PneumEvolve, Relationship, Work, Health, etc.
                    </p>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs text-[var(--muted)]">
                      Pinned (current best framing)
                    </label>
                    <TextArea
                      value={activeCard.pinned || ""}
                      onChange={(v) => updateCard(activeCard.id, { pinned: v })}
                      rows={3}
                      placeholder='Example: "What do I want this to become?"'
                    />
                    <p className="mt-2 text-[11px] text-[var(--muted)]">
                      Your “clean sentence.” Earn it slowly.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <SmallButton variant="ghost" onClick={() => deleteCard(activeCard.id)}>
                      Delete topic
                    </SmallButton>
                  </div>
                </CardShell>

                <CardShell title="Add a note or question" subtitle="Write one true thing.">
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
                    <span className="text-[11px] text-[var(--muted)]">
                      Questions narrow. Notes unload.
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    <TextArea
                      value={draftText}
                      onChange={setDraftText}
                      rows={4}
                      placeholder={
                        draftKind === "question"
                          ? 'Example: "What would make this easier to start?"'
                          : 'Example: "I keep trying to solve the whole world at once."'
                      }
                    />
                    <div className="flex gap-2">
                      <SmallButton onClick={addItem}>Add</SmallButton>
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
                          <SmallButton onClick={saveEdit}>Save</SmallButton>
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
                          Make it more true, not more impressive.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {(activeCard.items || []).length === 0 ? (
                      <p className="text-xs text-[var(--muted)]">
                        Nothing yet. Add one question you actually care about.
                      </p>
                    ) : (
                      activeCard.items.map((item) => (
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
          Local-only tester. Next upgrade could be “Export to Forge” later — not now.
        </footer>
      </div>
    </main>
  );
}