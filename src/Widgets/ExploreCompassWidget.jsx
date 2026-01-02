import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import useLocalStorageState from "../utils/useLocalStorageState";

const DEFAULT_STATE = {
  step: 0, // 0 choose lane, 1 explore, 2 capture
  lane: null, // "learn" | "browse" | "connect" | "wonder"
  cardId: "",
  question: "",
  microTask: "",
  capture: "",
  takeaways: [], // [{ id, lane, cardTitle, question, microTask, capture, createdAt }]
  updatedAt: Date.now(),
};

const LANES = [
  {
    id: "learn",
    label: "Learn",
    desc: "Reduce confusion into one clear thing you now know.",
    flavor: "Clarity mode",
    cards: [
      {
        id: "learn-101",
        title: "Explain it simply",
        question: "What’s the simplest explanation of what I’m stuck on?",
        microTask: "Write a 5-sentence explanation like you’re teaching a smart friend.",
      },
      {
        id: "learn-102",
        title: "Example + counterexample",
        question: "What is one example and one counterexample?",
        microTask: "Write 2 bullets: one that fits, one that doesn’t — and why.",
      },
      {
        id: "learn-103",
        title: "The missing definition",
        question: "What word/concept am I using without a clear definition?",
        microTask: "Define it in 1–2 sentences. Then list 3 implications.",
      },
      {
        id: "learn-104",
        title: "Small experiment",
        question: "What’s the smallest experiment I could run today?",
        microTask: "Design a 10-minute test. Write: setup → action → expected signal.",
      },
      {
        id: "learn-105",
        title: "Common failure modes",
        question: "Where do people usually mess this up?",
        microTask: "List 3 common mistakes. Add one prevention for each.",
      },
      {
        id: "learn-106",
        title: "From vague to specific",
        question: "What part is vague, and what part is specific?",
        microTask: "Write: Vague (1 line) → Specific (1 line) → Next action (1 line).",
      },
      {
        id: "learn-107",
        title: "One trusted source",
        question: "What’s one solid reference I can rely on here?",
        microTask: "Find one source. Capture 3 bullet takeaways in your own words.",
      },
      {
        id: "learn-108",
        title: "Truth table",
        question: "What do I think is true, and what do I actually know is true?",
        microTask: "Make two lists: Belief vs Evidence. Move one item from belief → evidence.",
      },
    ],
  },

  {
    id: "browse",
    label: "Browse",
    desc: "Low-pressure scanning to discover what wants attention.",
    flavor: "Scout mode",
    cards: [
      {
        id: "browse-201",
        title: "Quick scan",
        question: "What stands out if I scan without committing?",
        microTask: "Skim 3 things (tabs/docs/pages). Write 1 sentence per thing.",
      },
      {
        id: "browse-202",
        title: "Energy check",
        question: "What feels most alive / interesting right now?",
        microTask: "Pick 1 item. Write: why it pulls you + what tiny step would honor it.",
      },
      {
        id: "browse-203",
        title: "Friction hunt",
        question: "What’s the smallest friction point I keep bumping into?",
        microTask: "Describe it clearly in 2 sentences. Then name the smallest fix attempt.",
      },
      {
        id: "browse-204",
        title: "Stale vs fresh",
        question: "What have I been avoiding because it’s stale or confusing?",
        microTask: "Choose 1 stale thing. Write one refresh action you can do in 5 minutes.",
      },
      {
        id: "browse-205",
        title: "The obvious next page",
        question: "If someone else opened this project, what page would they click next?",
        microTask: "Navigate there. Write what’s missing for a new person (3 bullets).",
      },
      {
        id: "browse-206",
        title: "What’s unclear at first glance?",
        question: "What’s confusing within 10 seconds of looking?",
        microTask: "Open 1 page. In 10 seconds, write what’s unclear. Then fix one label.",
      },
      {
        id: "browse-207",
        title: "Two good things",
        question: "What’s already working that I should keep?",
        microTask: "Find 2 things you like. Write what makes them work (1 line each).",
      },
      {
        id: "browse-208",
        title: "One tiny polish",
        question: "What’s one tiny change that would make this feel better immediately?",
        microTask: "Do one micro-polish: spacing, label, button copy, or removing clutter.",
      },
    ],
  },

  {
    id: "connect",
    label: "Connect",
    desc: "Link ideas together so the system becomes easier to navigate.",
    flavor: "Map mode",
    cards: [
      {
        id: "connect-301",
        title: "A → B because…",
        question: "What are two things that might belong together?",
        microTask: "Write 3 connections: A → B because ____. Keep them short.",
      },
      {
        id: "connect-302",
        title: "Same root",
        question: "What’s the common thread between these two problems?",
        microTask: "Write: Problem A, Problem B, Shared root (one sentence).",
      },
      {
        id: "connect-303",
        title: "Simplify the system",
        question: "What would make the whole system simpler?",
        microTask: "Name 1 thing to merge, 1 to rename, 1 to delete (if brave).",
      },
      {
        id: "connect-304",
        title: "Inputs & outputs",
        question: "What’s the input and output of this thing I’m building?",
        microTask: "Write: input → process → output. Then spot the missing piece.",
      },
      {
        id: "connect-305",
        title: "User journey wire",
        question: "How does a stranger get from ‘arrive’ to ‘value’?",
        microTask: "Write a 5-step journey. Then mark the weakest step.",
      },
      {
        id: "connect-306",
        title: "Dependency map",
        question: "What depends on what here?",
        microTask: "List 5 items. Draw arrows in text like A -> B. Circle the bottleneck.",
      },
      {
        id: "connect-307",
        title: "Theme detection",
        question: "What’s the theme I keep returning to?",
        microTask: "Write the theme in 7 words. Then list 3 places it shows up.",
      },
      {
        id: "connect-308",
        title: "One unifying sentence",
        question: "If I had to unify this into one sentence, what is it?",
        microTask: "Write 3 options. Pick the best. Rewrite once to make it clearer.",
      },
    ],
  },

  {
    id: "wonder",
    label: "Wonder",
    desc: "Ask sharper questions without spiraling. Curiosity with boundaries.",
    flavor: "Question mode",
    cards: [
      {
        id: "wonder-401",
        title: "If it was easy…",
        question: "If this was easy, what would it look like?",
        microTask: "Write the “easy version” in 3 bullets. Then do the smallest bullet now.",
      },
      {
        id: "wonder-402",
        title: "The honest question",
        question: "What’s the next most honest question?",
        microTask: "Write 1 question. Then write 3 possible answers (no judging).",
      },
      {
        id: "wonder-403",
        title: "What am I avoiding?",
        question: "What am I avoiding because it feels ambiguous?",
        microTask: "Name the avoidance. Then write the smallest safe step toward it.",
      },
      {
        id: "wonder-404",
        title: "Constraints",
        question: "What constraint am I pretending doesn’t exist?",
        microTask: "List 3 constraints. Pick one. Design a move that respects it.",
      },
      {
        id: "wonder-405",
        title: "What would future-me say?",
        question: "What would future-me thank me for doing today?",
        microTask: "Write 1 action future-you would love. Make it 10 minutes or less.",
      },
      {
        id: "wonder-406",
        title: "Belief test (gentle)",
        question: "What belief am I carrying that might be untested?",
        microTask: "Write the belief. Then write one gentle reality test (not harsh).",
      },
      {
        id: "wonder-407",
        title: "What matters?",
        question: "What matters here if I stop performing and just tell the truth?",
        microTask: "Write 3 values. Then write one action aligned to the top value.",
      },
      {
        id: "wonder-408",
        title: "Zoom levels",
        question: "Am I zoomed in too far — or too far out?",
        microTask: "Write: zoom in (specific task) + zoom out (why it matters). Do one tweak.",
      },
    ],
  },
];

function now() {
  return Date.now();
}

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeState(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
  const merged = { ...DEFAULT_STATE, ...raw };
  if (!Array.isArray(merged.takeaways)) merged.takeaways = [];
  return merged;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function ExploreCompassWidget({
  storageKey = "pe_explore_compass_universal_v2",
  title = "Curiosity Compass",
  quickLink, // optional: { label, to }
}) {
  const [raw, setRaw] = useLocalStorageState(storageKey, DEFAULT_STATE);
  const state = useMemo(() => safeState(raw), [raw]);

  const laneMeta = state.lane ? LANES.find((l) => l.id === state.lane) : null;

  const reset = () => setRaw({ ...DEFAULT_STATE, updatedAt: now() });

  const chooseLane = (laneId) => {
    const l = LANES.find((x) => x.id === laneId);
    if (!l) return;
    const card = pick(l.cards);
    setRaw({
      ...state,
      step: 1,
      lane: laneId,
      cardId: card.id,
      question: card.question,
      microTask: card.microTask,
      capture: "",
      updatedAt: now(),
    });
  };

  const reroll = () => {
    if (!laneMeta) return;
    const card = pick(laneMeta.cards);
    setRaw({
      ...state,
      cardId: card.id,
      question: card.question,
      microTask: card.microTask,
      updatedAt: now(),
    });
  };

  const goCapture = () => setRaw({ ...state, step: 2, updatedAt: now() });

  const back = () => {
    if (state.step === 2) return setRaw({ ...state, step: 1, updatedAt: now() });
    setRaw({
      ...state,
      step: 0,
      lane: null,
      cardId: "",
      question: "",
      microTask: "",
      capture: "",
      updatedAt: now(),
    });
  };

  const updateCapture = (capture) => setRaw({ ...state, capture, updatedAt: now() });

  const saveTakeaway = () => {
    const capture = (state.capture || "").trim();
    if (!state.lane || !capture) return;

    const cardTitle =
      laneMeta?.cards?.find((c) => c.id === state.cardId)?.title ?? "";

    const item = {
      id: uuid(),
      lane: state.lane,
      cardTitle,
      question: (state.question || "").trim(),
      microTask: (state.microTask || "").trim(),
      capture,
      createdAt: now(),
    };

    setRaw({
      ...state,
      takeaways: [item, ...state.takeaways],
      updatedAt: now(),
    });
  };

  const deleteTakeaway = (id) =>
    setRaw({
      ...state,
      takeaways: state.takeaways.filter((t) => t.id !== id),
      updatedAt: now(),
    });

  const clearTakeaways = () => setRaw({ ...state, takeaways: [], updatedAt: now() });

  const laneBadge = laneMeta ? `${laneMeta.label} • ${laneMeta.flavor}` : "";

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-[var(--muted)]">
            Pick a lane, get a coherent prompt + micro-task, capture one takeaway.
          </p>
          {laneBadge ? (
            <p className="mt-1 text-[11px] text-[var(--muted)]">{laneBadge}</p>
          ) : null}
        </div>

        <button
          onClick={reset}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--text)] transition"
          type="button"
        >
          Reset
        </button>
      </div>

      {/* Optional quick portal */}
      {quickLink?.to ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to={quickLink.to}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
          >
            {quickLink.label ?? "Open"}
          </Link>
        </div>
      ) : null}

      {/* Step 0 */}
      {state.step === 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LANES.map((l) => (
            <button
              key={l.id}
              onClick={() => chooseLane(l.id)}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-left shadow-sm hover:shadow transition"
              type="button"
            >
              <div className="text-sm font-semibold">{l.label}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">{l.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* Step 1 */}
      {state.step === 1 && laneMeta && (
        <div className="mt-4 space-y-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            {state.cardId ? (
              <div className="text-[11px] text-[var(--muted)]">
                {laneMeta.cards.find((c) => c.id === state.cardId)?.title ?? ""}
              </div>
            ) : null}

            <div className="mt-2 text-xs text-[var(--muted)]">Question</div>
            <div className="mt-1 text-sm font-semibold break-words">{state.question}</div>

            <div className="mt-3 text-xs text-[var(--muted)]">Micro-task</div>
            <div className="mt-1 text-sm break-words">{state.microTask}</div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={reroll}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
              type="button"
            >
              Reroll
            </button>

            <button
              onClick={goCapture}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
              type="button"
            >
              Capture takeaway
            </button>

            <button
              onClick={back}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition self-center"
              type="button"
            >
              ← back
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {state.step === 2 && laneMeta && (
        <div className="mt-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="text-xs text-[var(--muted)]">Capture</div>
            <div className="mt-1 text-sm font-semibold">What did you find?</div>

            <textarea
              value={state.capture}
              onChange={(e) => updateCapture(e.target.value)}
              rows={5}
              className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              placeholder="One paragraph. Or 3 bullets. Keep it simple."
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={saveTakeaway}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition disabled:opacity-60"
              type="button"
              disabled={!state.capture.trim()}
            >
              Save takeaway
            </button>

            <button
              onClick={() =>
                setRaw({
                  ...state,
                  step: 0,
                  lane: null,
                  cardId: "",
                  question: "",
                  microTask: "",
                  capture: "",
                  updatedAt: now(),
                })
              }
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
              type="button"
            >
              New explore
            </button>

            <button
              onClick={back}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
              type="button"
            >
              Back
            </button>
          </div>

          <p className="mt-3 text-[11px] text-[var(--muted)]">
            Saved locally • {new Date(state.updatedAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* TAKEAWAYS LIST */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Recent takeaways</h4>
          <button
            onClick={clearTakeaways}
            className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition"
            type="button"
            disabled={state.takeaways.length === 0}
          >
            Clear all
          </button>
        </div>

        {state.takeaways.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            No takeaways yet. Save one after an explore.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {state.takeaways.slice(0, 10).map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-[var(--muted)]">
                      {t.lane?.toUpperCase?.() ?? "EXPLORE"} •{" "}
                      {new Date(t.createdAt).toLocaleString()}
                    </div>

                    {t.cardTitle ? (
                      <div className="mt-1 text-xs text-[var(--muted)] break-words">
                        <span className="font-medium">Card:</span> {t.cardTitle}
                      </div>
                    ) : null}

                    {t.question ? (
                      <div className="mt-1 text-xs text-[var(--muted)] break-words">
                        <span className="font-medium">Q:</span> {t.question}
                      </div>
                    ) : null}

                    <div className="mt-1 text-sm break-words">{t.capture}</div>
                  </div>

                  <button
                    onClick={() => deleteTakeaway(t.id)}
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
    </section>
  );
}
