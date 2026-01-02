// src/Pages/FlowMapToolPage.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Flow Map Tool (MVP)
 * Inside → Choice → Behavior → Ripple
 * - Local-only (localStorage)
 * - Thread-based (one recurring pattern = one thread)
 * - Add short notes whenever it comes up
 */

const LS_KEY = "pe_flow_map_v1";

const DEFAULT_STATE = {
  threads: [], // [{ id, title, createdAt, updatedAt, fields: { inside, choice, behavior, ripple, tiny }, notes: [{id,text,createdAt}] }]
  activeId: null,
  updatedAt: Date.now(),
};

function now() {
  return Date.now();
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return safeState(parsed);
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function safeState(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
  const merged = { ...DEFAULT_STATE, ...raw };

  if (!Array.isArray(merged.threads)) merged.threads = [];
  merged.threads = merged.threads
    .filter(Boolean)
    .map((t) => {
      const fields = t.fields && typeof t.fields === "object" ? t.fields : {};
      const notes = Array.isArray(t.notes) ? t.notes : [];
      return {
        id: t.id || uuid(),
        title: typeof t.title === "string" ? t.title : "(untitled)",
        createdAt: typeof t.createdAt === "number" ? t.createdAt : now(),
        updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : now(),
        fields: {
          inside: typeof fields.inside === "string" ? fields.inside : "",
          choice: typeof fields.choice === "string" ? fields.choice : "",
          behavior: typeof fields.behavior === "string" ? fields.behavior : "",
          ripple: typeof fields.ripple === "string" ? fields.ripple : "",
          tiny: typeof fields.tiny === "string" ? fields.tiny : "",
        },
        notes: notes
          .filter(Boolean)
          .map((n) => ({
            id: n.id || uuid(),
            text: typeof n.text === "string" ? n.text : "",
            createdAt: typeof n.createdAt === "number" ? n.createdAt : now(),
          }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
      };
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  if (merged.activeId && !merged.threads.some((t) => t.id === merged.activeId)) {
    merged.activeId = null;
  }
  if (!merged.activeId && merged.threads.length) merged.activeId = merged.threads[0].id;

  return merged;
}

function persist(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...state, updatedAt: now() }));
  } catch {
    // ignore
  }
}

function Card({ title, subtitle, children }) {
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

function SmallButton({ children, onClick, disabled, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export default function FlowMapToolPage() {
  const [raw, setRaw] = useState(() => safeLoad());
  const state = useMemo(() => safeState(raw), [raw]);

  const [newTitle, setNewTitle] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  const active = useMemo(
    () => state.threads.find((t) => t.id === state.activeId) || null,
    [state.threads, state.activeId]
  );

  const update = (patch) => {
    const next = { ...state, ...patch, updatedAt: now() };
    setRaw(next);
    persist(next);
  };

  const patchThread = (id, patch) => {
    const nextThreads = state.threads.map((t) =>
      t.id === id ? { ...t, ...patch, updatedAt: now() } : t
    );
    update({ threads: nextThreads });
  };

  const patchFields = (id, fieldsPatch) => {
    const nextThreads = state.threads.map((t) => {
      if (t.id !== id) return t;
      return {
        ...t,
        fields: { ...t.fields, ...fieldsPatch },
        updatedAt: now(),
      };
    });
    update({ threads: nextThreads });
  };

  const addThread = () => {
    const title = (newTitle || "").trim() || "A recurring pattern";
    const id = uuid();
    const item = {
      id,
      title,
      createdAt: now(),
      updatedAt: now(),
      fields: { inside: "", choice: "", behavior: "", ripple: "", tiny: "" },
      notes: [],
    };
    update({ threads: [item, ...state.threads], activeId: id });
    setNewTitle("");
  };

  const deleteThread = (id) => {
    const nextThreads = state.threads.filter((t) => t.id !== id);
    const nextActive =
      state.activeId === id ? (nextThreads[0]?.id ?? null) : state.activeId;
    update({ threads: nextThreads, activeId: nextActive });
    setNoteDraft("");
  };

  const addNote = () => {
    if (!active) return;
    const text = (noteDraft || "").trim();
    if (!text) return;

    const n = { id: uuid(), text, createdAt: now() };
    const nextThreads = state.threads.map((t) =>
      t.id === active.id
        ? { ...t, notes: [n, ...(t.notes || [])], updatedAt: now() }
        : t
    );
    update({ threads: nextThreads });
    setNoteDraft("");
  };

  const deleteNote = (noteId) => {
    if (!active) return;
    const nextThreads = state.threads.map((t) => {
      if (t.id !== active.id) return t;
      return { ...t, notes: (t.notes || []).filter((n) => n.id !== noteId), updatedAt: now() };
    });
    update({ threads: nextThreads });
  };

  const resetAll = () => {
    const next = { ...DEFAULT_STATE };
    setRaw(next);
    persist(next);
    setNewTitle("");
    setNoteDraft("");
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Flow Map
            </h1>
            <p className="text-sm text-[var(--muted)] max-w-prose">
              A simple place to map a repeating pattern: what happens inside → what choice you make → what you do → what it impacts.
              No streaks. No guilt. Just clarity.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            >
              ← Home
            </Link>
            <SmallButton onClick={resetAll} title="Clears everything on this page (localStorage)">
              Reset
            </SmallButton>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT: thread list */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Patterns</h2>
              <span className="text-xs text-[var(--muted)]">({state.threads.length})</span>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addThread();
                  }
                }}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                placeholder='Add a pattern… (e.g., "I shut down when overwhelmed")'
              />
              <SmallButton onClick={addThread} disabled={!newTitle.trim()}>
                Add
              </SmallButton>
            </div>

            {state.threads.length === 0 ? (
              <p className="mt-3 text-xs text-[var(--muted)]">
                Add one recurring situation. This is not a daily tracker — just a place to return when it shows up.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {state.threads.slice(0, 20).map((t) => {
                  const isActive = t.id === state.activeId;
                  return (
                    <li key={t.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg)]">
                      <button
                        type="button"
                        onClick={() => update({ activeId: t.id })}
                        className="w-full text-left px-3 py-3"
                        title="Open"
                      >
                        <div className={`text-sm font-semibold break-words ${isActive ? "" : "opacity-90"}`}>
                          {t.title}
                        </div>
                        <div className="mt-1 text-[11px] text-[var(--muted)]">
                          Updated {new Date(t.updatedAt).toLocaleString()}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {state.threads.length > 20 ? (
              <p className="mt-2 text-[11px] text-[var(--muted)]">Showing latest 20.</p>
            ) : null}
          </section>

          {/* RIGHT: editor */}
          <div className="lg:col-span-2 space-y-4">
            {!active ? (
              <Card title="Start with one pattern" subtitle="Small and honest beats perfect.">
                <p>
                  Add a pattern on the left. Then fill in only what you can.
                  This is allowed to be incomplete.
                </p>
              </Card>
            ) : (
              <>
                <Card title="Pattern" subtitle="Rename it anytime.">
                  <input
                    value={active.title}
                    onChange={(e) => patchThread(active.id, { title: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                  />

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field
                      label="Inside"
                      hint="What it feels like in your body/mind before the choice."
                      value={active.fields.inside}
                      onChange={(v) => patchFields(active.id, { inside: v })}
                      placeholder='e.g., "Chest tight, thoughts fast, I want to escape"'
                    />
                    <Field
                      label="Choice"
                      hint="The fork-in-the-road moment."
                      value={active.fields.choice}
                      onChange={(v) => patchFields(active.id, { choice: v })}
                      placeholder='e.g., "I decide to withdraw / push through / numb out"'
                    />
                    <Field
                      label="Behavior"
                      hint="What you do (or don’t do) after that choice."
                      value={active.fields.behavior}
                      onChange={(v) => patchFields(active.id, { behavior: v })}
                      placeholder='e.g., "I cancel plans and doomscroll"'
                    />
                    <Field
                      label="Ripple"
                      hint="What it affects (you, relationships, work, tomorrow)."
                      value={active.fields.ripple}
                      onChange={(v) => patchFields(active.id, { ripple: v })}
                      placeholder='e.g., "More isolation → guilt → harder next day"'
                    />
                  </div>

                  <div className="mt-3">
                    <Field
                      label="Tiny alternative"
                      hint="One survivable next action you’d like to try when it shows up."
                      value={active.fields.tiny}
                      onChange={(v) => patchFields(active.id, { tiny: v })}
                      placeholder='e.g., "Name it out loud + drink water + 2-minute tidy"'
                      rows={3}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <SmallButton
                      onClick={() => {
                        // quick scroll to notes
                        const el = document.getElementById("flow-notes");
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      Jump to notes ↓
                    </SmallButton>

                    <SmallButton
                      onClick={() => deleteThread(active.id)}
                      title="Delete this pattern"
                    >
                      Delete pattern
                    </SmallButton>
                  </div>
                </Card>

                <Card
                  title="Notes"
                  subtitle="Add a sentence when it happens. That’s enough."
                >
                  <div id="flow-notes" />

                  <div className="mt-2 flex gap-2">
                    <input
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addNote();
                        }
                      }}
                      className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                      placeholder='Add a quick note… ("Happened at work. I paused + breathed.")'
                    />
                    <SmallButton onClick={addNote} disabled={!noteDraft.trim()}>
                      Save
                    </SmallButton>
                  </div>

                  {active.notes.length === 0 ? (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      No notes yet. When this pattern shows up again, add one line.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {active.notes.slice(0, 25).map((n) => (
                        <li
                          key={n.id}
                          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[11px] text-[var(--muted)]">
                                {new Date(n.createdAt).toLocaleString()}
                              </div>
                              <div className="mt-1 text-sm text-[var(--text)] break-words">
                                {n.text}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteNote(n.id)}
                              className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                              title="Delete note"
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {active.notes.length > 25 ? (
                    <p className="mt-2 text-[11px] text-[var(--muted)]">Showing latest 25 notes.</p>
                  ) : null}

                  <p className="mt-4 text-[11px] text-[var(--muted)]">
                    Local only • {new Date(state.updatedAt).toLocaleString()}
                  </p>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, hint, value, onChange, placeholder, rows = 4 }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      {hint ? <div className="mt-1 text-[11px] text-[var(--muted)] opacity-90">{hint}</div> : null}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)]"
        placeholder={placeholder}
      />
    </div>
  );
}
