// src/Pages/DecisionBoard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Decision Board
 * - Fully local (localStorage)
 * - Editable headings + editable content
 * - Simple, universal decision helper (pros/cons + constraints + next step)
 */

const LS_KEY = "pe_decision_board_v1";

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

function daysBetween(now, target) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(target);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / msPerDay);
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

function SmallButton({ children, onClick, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
    >
      {children}
    </button>
  );
}

function EditableTitle({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent text-sm font-semibold text-[var(--text)] border-b border-dashed border-[var(--border)] focus:outline-none focus:border-solid"
    />
  );
}

function ListItemRow({ text, onRemove }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2">
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

export default function DecisionBoard() {
  const initial = useMemo(() => {
    const stored = loadState();
    if (stored) return stored;

    // Default: decision date 14 days from now
    const d = new Date();
    d.setDate(d.getDate() + 14);

    return {
      decisionDateISO: d.toISOString().slice(0, 10),

      // Editable headings
      prosTitle: "Reasons to choose Option A",
      consTitle: "Reasons to choose Option B",
      tinyNextTitle: "Tiny next step",
      noteTitle: "Private note",
      constraintsTitle: "Constraints (what must be true)",

      // Content
      pros: [],
      cons: [],
      constraints: [],
      tinyNext: "Drink water. Eat something small. Then do one 10-minute task.",
      note: "",

      version: 1,
    };
  }, []);

  const [decisionDateISO, setDecisionDateISO] = useState(initial.decisionDateISO);

  const [prosTitle, setProsTitle] = useState(initial.prosTitle);
  const [consTitle, setConsTitle] = useState(initial.consTitle);
  const [constraintsTitle, setConstraintsTitle] = useState(initial.constraintsTitle);
  const [tinyNextTitle, setTinyNextTitle] = useState(initial.tinyNextTitle);
  const [noteTitle, setNoteTitle] = useState(initial.noteTitle);

  const [pros, setPros] = useState(initial.pros);
  const [cons, setCons] = useState(initial.cons);
  const [constraints, setConstraints] = useState(initial.constraints || []);

  const [tinyNext, setTinyNext] = useState(initial.tinyNext);
  const [note, setNote] = useState(initial.note);

  const [prosDraft, setProsDraft] = useState("");
  const [consDraft, setConsDraft] = useState("");
  const [constraintsDraft, setConstraintsDraft] = useState("");

  useEffect(() => {
    saveState({
      decisionDateISO,
      prosTitle,
      consTitle,
      constraintsTitle,
      tinyNextTitle,
      noteTitle,
      pros,
      cons,
      constraints,
      tinyNext,
      note,
      version: 1,
    });
  }, [
    decisionDateISO,
    prosTitle,
    consTitle,
    constraintsTitle,
    tinyNextTitle,
    noteTitle,
    pros,
    cons,
    constraints,
    tinyNext,
    note,
  ]);

  const daysLeft = useMemo(() => {
    const target = new Date(decisionDateISO);
    if (Number.isNaN(target.getTime())) return null;
    return daysBetween(new Date(), target);
  }, [decisionDateISO]);

  const addItem = (which) => {
    const draft =
      which === "pros" ? prosDraft : which === "cons" ? consDraft : constraintsDraft;

    const text = (draft || "").trim();
    if (!text) return;

    const item = { id: safeUUID(), text };

    if (which === "pros") {
      setPros((prev) => [item, ...prev]);
      setProsDraft("");
    } else if (which === "cons") {
      setCons((prev) => [item, ...prev]);
      setConsDraft("");
    } else {
      setConstraints((prev) => [item, ...prev]);
      setConstraintsDraft("");
    }
  };

  const removeItem = (which, id) => {
    if (which === "pros") setPros((prev) => prev.filter((x) => x.id !== id));
    else if (which === "cons") setCons((prev) => prev.filter((x) => x.id !== id));
    else setConstraints((prev) => prev.filter((x) => x.id !== id));
  };

  const resetBoard = () => {
    // soft reset; keeps the date
    setPros([]);
    setCons([]);
    setConstraints([]);
    setProsDraft("");
    setConsDraft("");
    setConstraintsDraft("");
    setTinyNext("Drink water. Eat something small. Then do one 10-minute task.");
    setNote("");
  };

  const scrollToBoard = () => {
    const el = document.getElementById("decision-board");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Decision Board
            </h1>
            <p className="text-sm text-[var(--muted)]">
              A simple place to put the truth down so it stops spinning in your head.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/garden"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            >
              ← Garden
            </Link>
            <Link
              to="/"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            >
              Home
            </Link>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <Card title="Start here" subtitle="No pressure. No proving. Just a next step.">
            <p>
              If you’re overwhelmed, don’t decide from panic. Decide from what’s survivable.
              If both options feel brutal, pick the one that keeps you steadier — then reassess.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <SmallButton onClick={scrollToBoard}>Take me to the board ↓</SmallButton>
              <SmallButton onClick={resetBoard}>Reset</SmallButton>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Decision window" subtitle="Set the date you want to decide by.">
              <label className="block text-xs text-[var(--muted)]">Decision date</label>
              <input
                type="date"
                value={decisionDateISO}
                onChange={(e) => setDecisionDateISO(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              />

              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                <p className="text-xs text-[var(--muted)]">Days left</p>
                <p className="mt-1 text-lg font-semibold text-[var(--text)]">
                  {daysLeft === null ? "—" : daysLeft < 0 ? "Past date" : `${daysLeft} days`}
                </p>
              </div>

              <p className="mt-3 text-xs text-[var(--muted)]">
                Rule: you only have to be honest with yourself.
              </p>
            </Card>

            <Card title="Tiny next step" subtitle="Make it small enough you’ll actually do it.">
              <EditableTitle value={tinyNextTitle} onChange={setTinyNextTitle} />
              <textarea
                value={tinyNext}
                onChange={(e) => setTinyNext(e.target.value)}
                rows={5}
                className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                placeholder="One tiny step..."
              />
              <p className="mt-3 text-xs text-[var(--muted)]">
                If you do only this, you still moved the needle.
              </p>
            </Card>

            <Card title="Private note" subtitle="Write freely. No consequences.">
              <EditableTitle value={noteTitle} onChange={setNoteTitle} />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={5}
                className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                placeholder="Let it out here..."
              />
              <p className="mt-3 text-xs text-[var(--muted)]">
                Stored locally in your browser (localStorage).
              </p>
            </Card>
          </div>

          <Card
            title="Constraints"
            subtitle="These are the non-negotiables. They protect you from fantasy decisions."
          >
            <EditableTitle value={constraintsTitle} onChange={setConstraintsTitle} />

            <div className="mt-3 flex gap-2">
              <input
                value={constraintsDraft}
                onChange={(e) => setConstraintsDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem("constraints");
                  }
                }}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                placeholder='e.g., "I need to stay stable enough to parent"'
              />
              <SmallButton onClick={() => addItem("constraints")}>Add</SmallButton>
            </div>

            <ul className="mt-3 space-y-2">
              {constraints.length === 0 ? (
                <li className="text-xs text-[var(--muted)]">
                  Add 1–3 constraints. These are the guardrails.
                </li>
              ) : (
                constraints.map((item) => (
                  <ListItemRow
                    key={item.id}
                    text={item.text}
                    onRemove={() => removeItem("constraints", item.id)}
                  />
                ))
              )}
            </ul>
          </Card>

          <Card
            title="The board"
            subtitle="Option A and Option B. Rename the headings to match your situation."
          >
            <div id="decision-board" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <EditableTitle value={prosTitle} onChange={setProsTitle} />

                <div className="mt-3 flex gap-2">
                  <input
                    value={prosDraft}
                    onChange={(e) => setProsDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addItem("pros");
                      }
                    }}
                    className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)]"
                    placeholder='e.g., "keeps income steady while I regroup"'
                  />
                  <SmallButton onClick={() => addItem("pros")}>Add</SmallButton>
                </div>

                <ul className="mt-3 space-y-2">
                  {pros.length === 0 ? (
                    <li className="text-xs text-[var(--muted)]">
                      Empty is allowed. Add only what feels true.
                    </li>
                  ) : (
                    pros.map((item) => (
                      <ListItemRow
                        key={item.id}
                        text={item.text}
                        onRemove={() => removeItem("pros", item.id)}
                      />
                    ))
                  )}
                </ul>
              </div>

              {/* Option B */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <EditableTitle value={consTitle} onChange={setConsTitle} />

                <div className="mt-3 flex gap-2">
                  <input
                    value={consDraft}
                    onChange={(e) => setConsDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addItem("cons");
                      }
                    }}
                    className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)]"
                    placeholder='e.g., "protects my nervous system right now"'
                  />
                  <SmallButton onClick={() => addItem("cons")}>Add</SmallButton>
                </div>

                <ul className="mt-3 space-y-2">
                  {cons.length === 0 ? (
                    <li className="text-xs text-[var(--muted)]">
                      Empty is allowed. Add only what feels true.
                    </li>
                  ) : (
                    cons.map((item) => (
                      <ListItemRow
                        key={item.id}
                        text={item.text}
                        onRemove={() => removeItem("cons", item.id)}
                      />
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
              <p className="text-sm text-[var(--muted)]">
                Quick check: if this decision had to be “good enough” instead of “perfect,”
                what would you choose? If you don’t know, that’s information — it means you
                need more data, more rest, or a smaller decision first.
              </p>
            </div>
          </Card>

          <footer className="mt-2 text-xs text-[var(--muted)]">
            This tool is allowed to be simple. You’re allowed to come back anytime.
          </footer>
        </div>
      </div>
    </main>
  );
}