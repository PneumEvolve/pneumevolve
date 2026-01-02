// src/Pages/SkippedStep.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * SkippedStep
 * A neutral, non-preachy decision helper:
 * State -> Options -> Fit Check -> Next micro-step
 * Local-only (localStorage).
 */

const LS_KEY = "pe_skipped_step_v1";

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

function safeUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function SmallButton({ children, onClick, type = "button", variant = "solid" }) {
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

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs shadow-sm transition
        border-[var(--border)] bg-[var(--bg)]
        ${active ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
    >
      {children}
    </button>
  );
}

function ListItemRow({ text, onRemove }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
      <span className="text-sm text-[var(--text)]">{text}</span>
      <button
        onClick={onRemove}
        className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
        type="button"
        aria-label="Remove"
      >
        ✕
      </button>
    </li>
  );
}

const STATE_PRESETS = [
  { id: "steady", label: "Steady" },
  { id: "tired", label: "Tired" },
  { id: "overwhelmed", label: "Overwhelmed" },
  { id: "anxious", label: "Anxious" },
  { id: "low", label: "Low / flat" },
];

const FIT_OPTIONS = [
  { id: "fits", label: "Fits (workable)" },
  { id: "maybe", label: "Maybe (needs tweaks)" },
  { id: "nope", label: "Not today" },
];

function defaultState() {
  return {
    version: 1,

    title: "The step we skip",
    subtitle: "A simple experiment: make choices that match your capacity.",

    situation: "",
    statePreset: "",
    stateNotes: "",

    options: [],
    optionDraft: "",

    chosenOptionId: "",
    fit: "",

    tweak: "",
    nextStep: "",
    nudgeEnabled: true,
  };
}

function buildNudge({ statePreset, fit, chosenText }) {
  // Short, non-judgmental nudges. User can ignore entirely.
  if (!statePreset && !fit && !chosenText) return "";

  // If they said "not today"
  if (fit === "nope") {
    return "If it’s not today, a useful next step is: pause the decision and do one small clarifying action (gather info, rest, ask one person, or set a check-in time).";
  }

  // If they chose "maybe"
  if (fit === "maybe") {
    return "If it’s a ‘maybe,’ try to name one tweak that would make it workable (smaller scope, shorter time-box, more support, or a reversible version).";
  }

  // If it fits and they're overwhelmed/tired
  if (fit === "fits" && (statePreset === "tired" || statePreset === "overwhelmed" || statePreset === "anxious")) {
    return "If it fits but your capacity is limited, consider the smallest reversible version of the choice (short time-box, easy exit, minimal commitment).";
  }

  // Generic fallback
  if (chosenText) {
    return "Quick check: what’s the smallest version of this that still moves you forward?";
  }

  return "";
}

export default function SkippedStep() {
  const initial = useMemo(() => {
    const stored = loadState();
    return stored ? { ...defaultState(), ...stored } : defaultState();
  }, []);

  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);

  const [situation, setSituation] = useState(initial.situation);

  const [statePreset, setStatePreset] = useState(initial.statePreset);
  const [stateNotes, setStateNotes] = useState(initial.stateNotes);

  const [options, setOptions] = useState(initial.options);
  const [optionDraft, setOptionDraft] = useState(initial.optionDraft);

  const [chosenOptionId, setChosenOptionId] = useState(initial.chosenOptionId);
  const [fit, setFit] = useState(initial.fit);

  const [tweak, setTweak] = useState(initial.tweak);
  const [nextStep, setNextStep] = useState(initial.nextStep);

  const [nudgeEnabled, setNudgeEnabled] = useState(
    initial.nudgeEnabled === undefined ? true : initial.nudgeEnabled
  );

  useEffect(() => {
    saveState({
      version: 1,
      title,
      subtitle,
      situation,
      statePreset,
      stateNotes,
      options,
      optionDraft,
      chosenOptionId,
      fit,
      tweak,
      nextStep,
      nudgeEnabled,
    });
  }, [
    title,
    subtitle,
    situation,
    statePreset,
    stateNotes,
    options,
    optionDraft,
    chosenOptionId,
    fit,
    tweak,
    nextStep,
    nudgeEnabled,
  ]);

  const chosenOption = useMemo(
    () => options.find((o) => o.id === chosenOptionId) || null,
    [options, chosenOptionId]
  );

  const nudgeText = useMemo(() => {
    if (!nudgeEnabled) return "";
    return buildNudge({
      statePreset,
      fit,
      chosenText: chosenOption?.text || "",
    });
  }, [nudgeEnabled, statePreset, fit, chosenOption]);

  const addOption = () => {
    const text = optionDraft.trim();
    if (!text) return;
    const item = { id: safeUUID(), text };
    setOptions((prev) => [item, ...prev]);
    setOptionDraft("");
    // auto-select first option added if none selected
    if (!chosenOptionId) setChosenOptionId(item.id);
  };

  const removeOption = (id) => {
    setOptions((prev) => prev.filter((x) => x.id !== id));
    if (chosenOptionId === id) setChosenOptionId("");
  };

  const reset = () => {
    const d = defaultState();
    setTitle(d.title);
    setSubtitle(d.subtitle);
    setSituation(d.situation);
    setStatePreset(d.statePreset);
    setStateNotes(d.stateNotes);
    setOptions(d.options);
    setOptionDraft(d.optionDraft);
    setChosenOptionId(d.chosenOptionId);
    setFit(d.fit);
    setTweak(d.tweak);
    setNextStep(d.nextStep);
    setNudgeEnabled(d.nudgeEnabled);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-[var(--muted)]">{subtitle}</p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            >
              ← Home
            </Link>
            <SmallButton onClick={reset} variant="ghost">
              Reset
            </SmallButton>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <Card
            title="A simple frame"
            subtitle="If a decision keeps repeating, it might be missing a step."
          >
            <p>
              Many of us decide as if our energy and stress don’t matter. This puts your current
              state back into the loop so your next step is more realistic.
            </p>

            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
              <label className="block text-xs text-[var(--muted)]">Optional: rename this tool</label>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)]"
                  placeholder="Tool title…"
                />
                <input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)]"
                  placeholder="One-line subtitle…"
                />
              </div>
            </div>
          </Card>

          <Card title="1) What’s the situation?" subtitle="One sentence is enough.">
            <textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              placeholder='e.g., "I’m deciding whether to take on this new commitment."'
            />
          </Card>

          <Card title="2) What state are you in?" subtitle="Not as a label. Just as context.">
            <div className="flex flex-wrap gap-2">
              {STATE_PRESETS.map((s) => (
                <Pill
                  key={s.id}
                  active={statePreset === s.id}
                  onClick={() => setStatePreset((prev) => (prev === s.id ? "" : s.id))}
                >
                  {s.label}
                </Pill>
              ))}
            </div>

            <textarea
              value={stateNotes}
              onChange={(e) => setStateNotes(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              placeholder="Optional notes (sleep, stress, capacity, constraints)…"
            />

            <p className="mt-3 text-xs text-[var(--muted)]">
              If your state shifts later, you can revisit. No need to force a permanent decision.
            </p>
          </Card>

          <Card title="3) Options (just list them)" subtitle="Two is plenty. Add more only if it helps.">
            <div className="flex gap-2">
              <input
                value={optionDraft}
                onChange={(e) => setOptionDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOption();
                  }
                }}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                placeholder='e.g., "Say yes, but time-box it to 2 weeks"'
              />
              <SmallButton onClick={addOption}>Add</SmallButton>
            </div>

            <ul className="mt-3 space-y-2">
              {options.length === 0 ? (
                <li className="text-xs text-[var(--muted)]">No options yet. That’s fine.</li>
              ) : (
                options.map((item) => (
                  <li
                    key={item.id}
                    className={`rounded-xl border px-3 py-2 transition ${
                      chosenOptionId === item.id
                        ? "border-[var(--border)] bg-[var(--bg)] opacity-100"
                        : "border-[var(--border)] bg-[var(--bg-elev)] opacity-90 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setChosenOptionId(item.id)}
                        className="text-left flex-1"
                      >
                        <p className="text-sm text-[var(--text)]">{item.text}</p>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">
                          {chosenOptionId === item.id ? "Selected" : "Tap to select"}
                        </p>
                      </button>
                      <button
                        onClick={() => removeOption(item.id)}
                        className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
                        type="button"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card title="4) Fit check" subtitle="Not ‘best.’ Just ‘workable from here.’">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
              <p className="text-xs text-[var(--muted)]">Selected option</p>
              <p className="mt-1 text-sm text-[var(--text)]">
                {chosenOption ? chosenOption.text : "—"}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {FIT_OPTIONS.map((f) => (
                <Pill key={f.id} active={fit === f.id} onClick={() => setFit((prev) => (prev === f.id ? "" : f.id))}>
                  {f.label}
                </Pill>
              ))}
            </div>

            <textarea
              value={tweak}
              onChange={(e) => setTweak(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              placeholder="If it needs tweaks: what would make it more workable?"
            />

            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
              <div>
                <p className="text-sm text-[var(--text)]">If you want a nudge</p>
                <p className="text-[11px] text-[var(--muted)]">
                  You can skip this. Toggle it off anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNudgeEnabled((v) => !v)}
                className={`rounded-full border px-3 py-1 text-xs transition
                  border-[var(--border)] ${nudgeEnabled ? "bg-[var(--bg-elev)]" : "bg-[var(--bg)] opacity-80"}`}
              >
                {nudgeEnabled ? "On" : "Off"}
              </button>
            </div>

            {nudgeText ? (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <p className="text-xs text-[var(--muted)]">Nudge</p>
                <p className="mt-1 text-sm text-[var(--text)]">{nudgeText}</p>
              </div>
            ) : null}
          </Card>

          <Card title="5) Next step" subtitle="One small action you can actually do.">
            <textarea
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              placeholder='e.g., "Ask one person for input" or "Make a 15-minute plan"'
            />

            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
              <p className="text-sm text-[var(--muted)]">
                This is a scratchpad. Use what helps, ignore what doesn’t.
              </p>
            </div>
          </Card>

          <footer className="mt-2 text-xs text-[var(--muted)]">
            Saves locally in your browser (localStorage). No account required.
          </footer>
        </div>
      </div>
    </main>
  );
}