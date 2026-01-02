import React, { useMemo } from "react";
import useLocalStorageState from "../utils/useLocalStorageState";

const DEFAULT_STATE = {
  step: 0, // 0 mood, 1 choose, 2 done
  mood: null, // "struggling" | "okay" | "ready"
  choice: null,
  note: "",

  // history
  entries: [], // [{ id, mood, choice, title, detail, note, createdAt }]
  entriesOpen: true,
  entriesView: "recent", // "recent" | "all"

  updatedAt: Date.now(),
};

const MOODS = [
  { id: "struggling", label: "I’m struggling 🫥", desc: "Low capacity today." },
  { id: "okay", label: "I’m okay 😐", desc: "Not bad, not great." },
  { id: "ready", label: "I’m ready 🙂", desc: "Energy is available." },
];

const PATHS = {
  struggling: [
    {
      id: "struggle_reset",
      title: "30 seconds: reset your body",
      detail: "Drop your shoulders. Slow inhale. Longer exhale. Repeat twice.",
      notePrompt: "What’s the hardest part right now (one sentence)?",
    },
    {
      id: "struggle_basic",
      title: "Basic needs check",
      detail: "Water, food, meds (if applicable), and a tiny bit of movement.",
      notePrompt: "What basic need do you want to support first?",
    },
    {
      id: "struggle_tinywin",
      title: "One tiny win (2 minutes)",
      detail: "Trash in the bin, 5 items away, or clear one small surface.",
      notePrompt: "What tiny win are you choosing?",
    },
    {
      id: "struggle_reachout",
      title: "Light connection",
      detail: "Send a simple message: “Hey—tough day. Just saying hi.”",
      notePrompt: "Who could you reach out to?",
    },
  ],
  okay: [
    {
      id: "okay_target",
      title: "Pick one small target (10 minutes)",
      detail: "Choose something you can actually finish. Set a timer. Start.",
      notePrompt: "What’s your 10-minute target?",
    },
    {
      id: "okay_reset",
      title: "Reset your space (5 minutes)",
      detail: "Quick tidy + fresh air + music. Then come back.",
      notePrompt: "What space are you resetting?",
    },
    {
      id: "okay_care",
      title: "Care move",
      detail: "Walk, stretch, shower, or eat something decent.",
      notePrompt: "What care move are you choosing?",
    },
    {
      id: "okay_message",
      title: "One helpful message",
      detail: "Check in on someone or reply to something you’ve been avoiding.",
      notePrompt: "What message are you sending?",
    },
  ],
  ready: [
    {
      id: "ready_sprint",
      title: "Focus sprint (25 minutes)",
      detail: "Pick one meaningful task. Timer. No multitasking.",
      notePrompt: "What are you focusing on?",
    },
    {
      id: "ready_create",
      title: "Create something small",
      detail: "Write, build, draw, plan, or make something tangible.",
      notePrompt: "What are you creating today?",
    },
    {
      id: "ready_connect",
      title: "Strengthen a relationship",
      detail: "Send appreciation or schedule time with someone you care about.",
      notePrompt: "Who are you investing in?",
    },
    {
      id: "ready_give",
      title: "Give energy outward",
      detail: "One kind action. One contribution. Keep it light.",
      notePrompt: "What’s your contribution?",
    },
  ],
};

function now() {
  return Date.now();
}

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function coerceState(value) {
  if (!value || typeof value !== "object") return { ...DEFAULT_STATE };

  const merged = { ...DEFAULT_STATE, ...value };

  // back-compat safety
  if (!Array.isArray(merged.entries)) merged.entries = [];
  if (merged.entriesView !== "recent" && merged.entriesView !== "all")
    merged.entriesView = "recent";
  if (typeof merged.entriesOpen !== "boolean")
    merged.entriesOpen = merged.entries.length > 0;

  return merged;
}

export default function CheckInWidget({
  storageKey = "pe_checkin_widget_v4",
  title = "Quick check-in",
}) {
  const [raw, setRaw] = useLocalStorageState(storageKey, DEFAULT_STATE);
  const state = useMemo(() => coerceState(raw), [raw]);

  const options = state.mood ? PATHS[state.mood] ?? [] : [];
  const chosen = useMemo(() => {
    if (!state.mood || !state.choice) return null;
    return (PATHS[state.mood] ?? []).find((x) => x.id === state.choice) ?? null;
  }, [state.mood, state.choice]);

  const setMood = (mood) => {
    setRaw({
      ...DEFAULT_STATE,
      entries: state.entries,
      entriesOpen: state.entriesOpen,
      entriesView: state.entriesView,
      mood,
      step: 1,
      updatedAt: now(),
    });
  };

  const choose = (choiceId) => {
    setRaw({
      ...state,
      choice: choiceId,
      step: 2,
      updatedAt: now(),
    });
  };

  const updateNote = (note) => {
    setRaw({ ...state, note, updatedAt: now() });
  };

  const reset = () =>
    setRaw({
      ...DEFAULT_STATE,
      entries: state.entries,
      entriesOpen: state.entriesOpen,
      entriesView: state.entriesView,
      updatedAt: now(),
    });

  const saveEntry = () => {
    if (!state.mood || !state.choice) return;

    const picked = (PATHS[state.mood] ?? []).find((x) => x.id === state.choice);
    if (!picked) return;

    const item = {
      id: uuid(),
      mood: state.mood,
      choice: state.choice,
      title: picked.title,
      detail: picked.detail,
      note: (state.note || "").trim(),
      createdAt: now(),
    };

    setRaw({
      ...state,
      entries: [item, ...state.entries],
      entriesOpen: true,
      updatedAt: now(),
    });
  };

  const deleteEntry = (id) =>
    setRaw({
      ...state,
      entries: state.entries.filter((e) => e.id !== id),
      updatedAt: now(),
    });

  const clearEntries = () => setRaw({ ...state, entries: [], updatedAt: now() });

  const toggleEntries = () =>
    setRaw({ ...state, entriesOpen: !state.entriesOpen, updatedAt: now() });

  const toggleEntriesView = () =>
    setRaw({
      ...state,
      entriesView: state.entriesView === "recent" ? "all" : "recent",
      updatedAt: now(),
    });

  const moodLabel =
    MOODS.find((m) => m.id === state.mood)?.label?.replace(/[^\w\s’]/g, "").trim() ??
    "";

  const shownEntries =
    state.entriesView === "recent" ? state.entries.slice(0, 3) : state.entries;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-[var(--muted)]">
            Pick what’s true. Then choose one small next step.
          </p>
        </div>

        <button
          onClick={reset}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--text)] transition"
          type="button"
          title="Reset"
        >
          Reset
        </button>
      </div>

      {/* Step 0: mood */}
      {state.step === 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMood(m.id)}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-left shadow-sm hover:shadow transition"
              type="button"
            >
              <div className="text-sm font-semibold">{m.label}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">{m.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* Step 1: choose path */}
      {state.step === 1 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs text-[var(--muted)]">
            Mood: <span className="font-medium">{moodLabel}</span> • Choose one option.
          </div>

          <div className="grid grid-cols-1 gap-2">
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => choose(o.id)}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-left shadow-sm hover:shadow transition"
                type="button"
              >
                <div className="text-sm font-semibold">{o.title}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">{o.detail}</div>
              </button>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() =>
                setRaw({
                  ...state,
                  step: 0,
                  mood: null,
                  choice: null,
                  updatedAt: now(),
                })
              }
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition"
              type="button"
            >
              ← back
            </button>
          </div>
        </div>
      )}

      {/* Step 2: done */}
      {state.step === 2 && chosen && (
        <div className="mt-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="text-sm font-semibold">{chosen.title}</div>
            <div className="mt-1 text-xs text-[var(--muted)]">{chosen.detail}</div>
          </div>

          <div className="mt-3">
            <label className="text-xs text-[var(--muted)]">{chosen.notePrompt}</label>
            <textarea
              value={state.note}
              onChange={(e) => updateNote(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              placeholder="One sentence is enough…"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={saveEntry}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
              type="button"
              title="Save this check-in to your history"
            >
              Save check-in
            </button>

            <button
              onClick={() => setRaw({ ...state, step: 1, updatedAt: now() })}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
              type="button"
            >
              Choose a different option
            </button>

            <button
              onClick={() =>
                setRaw({
                  ...DEFAULT_STATE,
                  entries: state.entries,
                  entriesOpen: state.entriesOpen,
                  entriesView: state.entriesView,
                  updatedAt: now(),
                })
              }
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
              type="button"
            >
              New check-in
            </button>
          </div>

          <p className="mt-3 text-[11px] text-[var(--muted)]">
            Local only • {new Date(state.updatedAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* HISTORY */}
      <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
        <button
          onClick={toggleEntries}
          type="button"
          className="w-full flex items-center justify-between gap-3 px-3 py-3"
          aria-expanded={state.entriesOpen}
        >
          <div className="text-sm font-semibold">
            Check-in history{" "}
            <span className="text-xs font-normal text-[var(--muted)]">
              ({state.entries.length})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleEntriesView();
              }}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition disabled:opacity-60"
              type="button"
              title="Toggle history view"
              disabled={state.entries.length <= 3}
            >
              {state.entriesView === "recent" ? "Show all" : "Show last 3"}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                clearEntries();
              }}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition disabled:opacity-60"
              type="button"
              disabled={state.entries.length === 0}
              title="Clear all history"
            >
              Clear
            </button>

            <span className="text-xs text-[var(--muted)]">
              {state.entriesOpen ? "▾" : "▸"}
            </span>
          </div>
        </button>

        {state.entriesOpen && (
          <div className="px-3 pb-3">
            {state.entries.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No saved check-ins yet.</p>
            ) : (
              <ul className="space-y-2">
                {shownEntries.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-[var(--muted)]">
                          {(e.mood ?? "").toUpperCase()} •{" "}
                          {new Date(e.createdAt).toLocaleString()}
                        </div>
                        <div className="mt-1 text-sm font-semibold break-words">
                          {e.title}
                        </div>
                        {e.note ? (
                          <div className="mt-2 text-xs text-[var(--muted)] break-words">
                            <span className="font-medium">Note:</span> {e.note}
                          </div>
                        ) : null}
                      </div>

                      <button
                        onClick={() => deleteEntry(e.id)}
                        className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--text)] transition"
                        type="button"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}