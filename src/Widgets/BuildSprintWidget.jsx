import React, { useMemo, useState, useEffect } from "react";
import useLocalStorageState from "../utils/useLocalStorageState";

const DEFAULT_STATE = {
  step: 0, // 0 setup, 1 running, 2 review
  lane: "create", // "fix" | "build" | "design" | "write"
  minutes: 25, // 10 | 25 | 45
  goal: "",
  notes: "",

  startedAt: null,
  endsAt: null,

  lastResult: "",

  // wins list
  wins: [], // [{ id, lane, goal, notes, result, createdAt }]
  winsView: "recent", // "recent" | "all"

  // UI
  winsOpen: true,

  updatedAt: Date.now(),
};

const LANES = [
  { id: "create", label: "Create", desc: "Make something new." },
  { id: "tend", label: "Tend", desc: "Maintain, organize, refine, strengthen." },
  { id: "resolve", label: "Resolve", desc: "Remove a blocker. Handle a problem." },
  { id: "discover", label: "Discover", desc: "Explore, research, learn, practice." },
];

const DURATIONS = [10, 25, 45];

function now() {
  return Date.now();
}

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function safeState(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };

  // Back-compat: older versions used takeaways[]
  const legacyTakeaways = Array.isArray(raw.takeaways) ? raw.takeaways : null;

  const merged = { ...DEFAULT_STATE, ...raw };

  // Normalize wins
  if (!Array.isArray(merged.wins)) merged.wins = [];
  if (merged.wins.length === 0 && legacyTakeaways?.length) {
    merged.wins = legacyTakeaways.map((t) => ({
      ...t,
      notes: typeof t.notes === "string" ? t.notes : "",
    }));
  }

  // Normalize strings
  if (typeof merged.goal !== "string") merged.goal = "";
  if (typeof merged.notes !== "string") merged.notes = "";
  if (typeof merged.lastResult !== "string") merged.lastResult = "";

  // winsOpen: default open if there are wins, closed if none
  if (typeof merged.winsOpen !== "boolean") {
    merged.winsOpen = merged.wins.length > 0;
  }

  // winsView
  if (merged.winsView !== "recent" && merged.winsView !== "all") {
    merged.winsView = "recent";
  }

  return merged;
}

export default function BuildSprintWidget({
  storageKey = "pe_build_sprint_universal_v3",
  title = "Sprint Builder",
}) {
  const [raw, setRaw] = useLocalStorageState(storageKey, DEFAULT_STATE);
  const state = useMemo(() => safeState(raw), [raw]);
  const [tick, setTick] = useState(0);

  // timer tick while running
  useEffect(() => {
    if (state.step !== 1 || !state.endsAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [state.step, state.endsAt]);

  // auto-finish when time runs out
  useEffect(() => {
    if (state.step !== 1 || !state.endsAt) return;
    if (now() >= state.endsAt) {
      setRaw({ ...state, step: 2, updatedAt: now() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const remainingMs = state.endsAt ? state.endsAt - now() : 0;
  const remainingLabel = formatTime(remainingMs);

  const update = (patch) => setRaw({ ...state, ...patch, updatedAt: now() });

  const start = () => {
    const goal = state.goal.trim();
    if (!goal) return;

    const startedAt = now();
    const endsAt = startedAt + state.minutes * 60 * 1000;

    setRaw({
      ...state,
      step: 1,
      startedAt,
      endsAt,
      updatedAt: now(),
    });
  };

  const endAndReview = () => setRaw({ ...state, step: 2, updatedAt: now() });

  // Reset the sprint flow but keep wins + UI prefs
  const reset = () =>
    setRaw({
      ...DEFAULT_STATE,
      wins: state.wins,
      winsOpen: state.winsOpen,
      winsView: state.winsView,
      updatedAt: now(),
    });

  const toggleWins = () =>
    setRaw({ ...state, winsOpen: !state.winsOpen, updatedAt: now() });

  const toggleWinsView = () =>
    setRaw({
      ...state,
      winsView: state.winsView === "recent" ? "all" : "recent",
      updatedAt: now(),
    });

  const saveWin = () => {
    const goal = (state.goal || "").trim();
    const notes = (state.notes || "").trim();
    const result = (state.lastResult || "").trim();
    if (!goal || !result) return;

    const item = {
      id: uuid(),
      lane: state.lane,
      goal,
      notes,
      result,
      createdAt: now(),
    };

    setRaw({
      ...state,
      wins: [item, ...state.wins],
      winsOpen: true,
      updatedAt: now(),
    });
  };

  const deleteWin = (id) =>
    setRaw({
      ...state,
      wins: state.wins.filter((t) => t.id !== id),
      updatedAt: now(),
    });

  const clearWins = () => setRaw({ ...state, wins: [], updatedAt: now() });

  const laneMeta = LANES.find((l) => l.id === state.lane) ?? LANES[1];

  const winsToShow =
    state.winsView === "recent" ? state.wins.slice(0, 3) : state.wins;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-[var(--muted)]">
            Pick a goal, write a tiny plan, run the timer, save a win.
          </p>
        </div>

        <button
          onClick={reset}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--text)] transition"
          type="button"
          title="Reset the current sprint (keeps wins)"
        >
          Reset
        </button>
      </div>

      {/* SPRINT BUILDER */}
      {state.step === 0 && (
        <>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LANES.map((l) => (
              <button
                key={l.id}
                onClick={() => update({ lane: l.id })}
                className={`rounded-xl border p-3 text-left shadow-sm transition
                  border-[var(--border)] bg-[var(--bg)]
                  ${
                    state.lane === l.id
                      ? "opacity-100"
                      : "opacity-80 hover:opacity-100"
                  }`}
                type="button"
              >
                <div className="text-sm font-semibold">{l.label}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">{l.desc}</div>
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {DURATIONS.map((m) => (
              <button
                key={m}
                onClick={() => update({ minutes: m })}
                className={`rounded-full border px-4 py-2 text-xs shadow-sm transition
                  border-[var(--border)] bg-[var(--bg)]
                  ${
                    state.minutes === m
                      ? "opacity-100"
                      : "opacity-80 hover:opacity-100"
                  }`}
                type="button"
              >
                {m} min
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label className="text-xs text-[var(--muted)]">
              What will be different after this sprint?
            </label>
            <input
              value={state.goal}
              onChange={(e) => update({ goal: e.target.value })}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              placeholder='Example: "Draft the outline" or "Fix the login bug"'
            />
          </div>

          <div className="mt-3">
            <label className="text-xs text-[var(--muted)]">
              Tiny plan (optional)
            </label>
            <textarea
              value={state.notes}
              onChange={(e) => update({ notes: e.target.value })}
              rows={3}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              placeholder={"Example:\n- Open file\n- Find failing case\n- Patch + test"}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={start}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition disabled:opacity-60"
              type="button"
              disabled={!state.goal.trim()}
            >
              Start sprint
            </button>

            <p className="text-xs text-[var(--muted)] self-center">
              Lane: <span className="font-medium">{laneMeta.label}</span>
            </p>
          </div>
        </>
      )}

      {/* RUNNING */}
      {state.step === 1 && (
        <>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="min-w-0">
              <div className="text-xs text-[var(--muted)]">Sprint goal</div>
              <div className="text-sm font-semibold break-words">{state.goal}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xs text-[var(--muted)]">Time left</div>
              <div className="text-sm font-semibold">{remainingLabel}</div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="text-xs text-[var(--muted)]">Plan / scratchpad</div>
            <textarea
              value={state.notes}
              onChange={(e) => update({ notes: e.target.value })}
              rows={5}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              placeholder="Write your outline, steps, or whatever helps you move."
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={endAndReview}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
              type="button"
            >
              End sprint & review
            </button>
          </div>
        </>
      )}

      {/* REVIEW */}
      {state.step === 2 && (
        <>
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="text-xs text-[var(--muted)]">Sprint completed</div>
            <div className="mt-1 text-sm font-semibold break-words">{state.goal}</div>

            <div className="mt-3">
              <label className="text-xs text-[var(--muted)]">Plan (optional)</label>
              <textarea
                value={state.notes}
                onChange={(e) => update({ notes: e.target.value })}
                rows={3}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                placeholder="Keep or refine your plan notes."
              />
            </div>

            <div className="mt-3">
              <label className="text-xs text-[var(--muted)]">
                What did you produce? (save as a win)
              </label>
              <textarea
                value={state.lastResult}
                onChange={(e) => update({ lastResult: e.target.value })}
                rows={3}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                placeholder='Example: "Finished the draft outline and cleaned the intro."'
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={saveWin}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition disabled:opacity-60"
                type="button"
                disabled={!state.goal.trim() || !state.lastResult.trim()}
              >
                Save win
              </button>

              <button
                onClick={() =>
                  setRaw({
                    ...DEFAULT_STATE,
                    lane: state.lane,
                    minutes: state.minutes,
                    wins: state.wins,
                    winsOpen: state.winsOpen,
                    winsView: state.winsView,
                    updatedAt: now(),
                  })
                }
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                type="button"
              >
                New sprint
              </button>

              <button
                onClick={() =>
                  setRaw({
                    ...state,
                    step: 0,
                    startedAt: null,
                    endsAt: null,
                    lastResult: "",
                    updatedAt: now(),
                  })
                }
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                type="button"
              >
                Adjust & restart
              </button>
            </div>
          </div>
        </>
      )}

      {/* WINS BELOW */}
      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
        <button
          onClick={toggleWins}
          type="button"
          className="w-full flex items-center justify-between gap-3 px-3 py-3"
          aria-expanded={state.winsOpen}
        >
          <div className="text-sm font-semibold">
            Wins{" "}
            <span className="text-xs font-normal text-[var(--muted)]">
              ({state.wins.length})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleWinsView();
              }}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition disabled:opacity-60"
              type="button"
              title="Toggle wins view"
              disabled={state.wins.length === 0}
            >
              {state.winsView === "recent" ? "Show all" : "Show last 3"}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                clearWins();
              }}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition disabled:opacity-60"
              type="button"
              disabled={state.wins.length === 0}
              title="Clear all wins"
            >
              Clear
            </button>

            <span className="text-xs text-[var(--muted)]">
              {state.winsOpen ? "▾" : "▸"}
            </span>
          </div>
        </button>

        {state.winsOpen && (
          <div className="px-3 pb-3">
            {state.wins.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">
                No wins yet. Save one after a sprint.
              </p>
            ) : (
              <ul className="space-y-2">
                {winsToShow.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-[var(--muted)]">
                          {t.lane?.toUpperCase?.() ?? "SPRINT"} •{" "}
                          {new Date(t.createdAt).toLocaleString()}
                        </div>

                        <div className="mt-1 text-sm font-semibold break-words">
                          {t.goal}
                        </div>

                        {t.notes ? (
                          <div className="mt-1 text-xs text-[var(--muted)] break-words">
                            <span className="font-medium">Plan:</span> {t.notes}
                          </div>
                        ) : null}

                        <div className="mt-1 text-xs text-[var(--muted)] break-words">
                          <span className="font-medium">Win:</span> {t.result}
                        </div>
                      </div>

                      <button
                        onClick={() => deleteWin(t.id)}
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

            {state.wins.length > 3 && state.winsView === "recent" ? (
              <p className="mt-2 text-[11px] text-[var(--muted)]">
                Showing last 3 wins.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}