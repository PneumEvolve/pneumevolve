// src/Pages/SheasGarden.jsx (rewrite)
// Renamed externally, but you can keep the file name for now.

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Garden of Hope and Understanding
 * - Universal language (not "my space")
 * - Practical micro-steps
 * - Intensity toggle: 1 / 10 / 30 minutes
 * - Designed to feel human, not inspirational
 */

const INTENSITIES = [
  { id: "1", label: "1 minute", hint: "Just stabilize." },
  { id: "10", label: "10 minutes", hint: "Get moving gently." },
  { id: "30", label: "30 minutes", hint: "Make a small turn." },
];

const SECTIONS = [
  {
    id: "impossible",
    title: "When the day feels impossible",
    blurb: "No speeches. Just a small landing pad.",
    body: [
      "You don’t need to solve your life today.",
      "You only need the next few minutes.",
      "Food counts. Water counts. Rest counts.",
      "Showing up imperfectly still counts.",
    ],
    steps: {
      "1": [
        "Drop your shoulders.",
        "Exhale longer than you inhale (two breaths).",
        "Take one sip of water. That’s a real move.",
      ],
      "10": [
        "Drink water (a few sips).",
        "Eat one easy bite (anything).",
        "Stand up and move for 60 seconds (pace, stretch, shake arms).",
        "Pick one tiny task: trash in bin / clear one surface / message one person.",
      ],
      "30": [
        "Water + a small snack.",
        "Quick reset: face wash or change shirt.",
        "10-minute tidy: one corner only.",
        "Open a note and write: “The next 3 hours are for ____.”",
      ],
    },
  },

  {
    id: "spiral",
    title: "When the mind spirals",
    blurb: "You don’t have to win the argument to be okay.",
    body: [
      "Spirals are often the brain trying to regain control while exhausted.",
      "The goal isn’t to think better. The goal is to come back to the room.",
    ],
    qa: [
      {
        q: "Why can’t I function like everyone else?",
        a: "Because your nervous system hits overload faster. That’s not a moral failure. It means you need smaller steps and kinder rules.",
      },
      {
        q: "What if I’m failing at life?",
        a: "When you’re depleted, your brain demands a verdict. You don’t need one today. If all you do is eat, drink water, and make it to tomorrow—count it.",
      },
      {
        q: "What if these thoughts mean something is wrong with me?",
        a: "Thoughts are not verdicts. They’re signals. Most spirals soften when the body gets a little safety: breath, water, food, movement, contact.",
      },
      {
        q: "Why do I hate the system so much?",
        a: "Because parts of it are dehumanizing. Your anger makes sense. You don’t have to solve society today—just protect your humanity for the next few hours.",
      },
    ],
    steps: {
      "1": [
        "Name the loop in 5 words (quietly).",
        "Feet on floor. Press toes down.",
        "Exhale slow. Look for 3 ordinary objects.",
      ],
      "10": [
        "Write the loop as one sentence.",
        "Write one counter-sentence: “Maybe, but not proven.”",
        "Do one body action: water / shower / step outside / stretch.",
        "Message someone: “Not doing great. Just saying hi.”",
      ],
      "30": [
        "Write: “What do I actually know is true right now?” (3 bullets).",
        "Then: “What is my brain guessing?” (3 bullets).",
        "Choose one grounded task for 10 minutes.",
        "Reward: warm drink, music, or sit outside for 3 minutes.",
      ],
    },
  },

  {
    id: "shame",
    title: "When shame / self-hate shows up",
    blurb: "Shame is heavy, but it’s not wisdom.",
    body: [
      "Shame usually tries to make you small so you’ll stop taking risks.",
      "You don’t need to believe the shame story to take a better next step.",
    ],
    steps: {
      "1": [
        "Put a hand on your chest.",
        "Say (even silently): “This is a shame wave.”",
        "One breath out. Longer than in.",
      ],
      "10": [
        "Write the shame sentence your mind is repeating.",
        "Rewrite it without cruelty: “I’m struggling with ____ right now.”",
        "Do one repair move: water / tidy 2 minutes / reply to one message / take meds if applicable.",
      ],
      "30": [
        "Write: “What would I tell a friend in this exact situation?”",
        "Do one small act of dignity: shower / clean shirt / step outside.",
        "Make one future-friendly move: set tomorrow’s clothes / prep one snack / set an alarm.",
      ],
    },
  },

  {
    id: "cantstart",
    title: "When you can’t start anything",
    blurb: "Stuck isn’t lazy. It’s friction + overwhelm.",
    body: [
      "If starting feels impossible, the task is too big or too undefined.",
      "We’re not pushing harder. We’re shrinking it until it moves.",
    ],
    steps: {
      "1": [
        "Pick one object near you.",
        "Move it to a better place.",
        "That’s starting.",
      ],
      "10": [
        "Pick one task and shrink it: ‘open the file’, ‘put socks in hamper’, ‘wash one dish’.",
        "Set a 6-minute timer.",
        "When it ends: stop or continue—both are wins.",
      ],
      "30": [
        "Write the task title.",
        "Write the first 3 micro-steps (ridiculously small).",
        "Work 15 minutes, rest 3 minutes, work 10 minutes.",
      ],
    },
  },

  {
    id: "workday",
    title: "Getting through the workday",
    blurb: "Not motivation. A script.",
    checklist: [
      {
        title: "Before work",
        items: [
          "Eat anything (even small).",
          "Drink water.",
          "You don’t have to feel ready. You only have to arrive.",
        ],
      },
      {
        title: "During work",
        items: [
          "Only the next task.",
          "Bathroom breaks are allowed.",
          "Tension is not proof you’re doing it wrong.",
          "If you’re overwhelmed: slow exhale + ask ‘what’s the next smallest task?’",
        ],
      },
      {
        title: "After work",
        items: [
          "You survived. That matters.",
          "You’re allowed to collapse.",
          "Do one recovery action: food / shower / lie down / quiet time.",
        ],
      },
    ],
    steps: {
      "1": ["Exhale slow.", "Say: “Just the next task.”", "Take one sip of water."],
      "10": [
        "Eat something quick.",
        "Pack one small comfort item (gum, snack, music).",
        "Decide the first task at work (one sentence).",
      ],
      "30": [
        "Water + food.",
        "Set a ‘minimum day’ plan: do the basics only.",
        "Write one line: “If I get overwhelmed, I will ____ (bathroom break / breathe / ask for help).”",
      ],
    },
  },

  {
    id: "basiccare",
    title: "Basic care",
    blurb: ["Pick one. That’s enough.", "This is maintenance, not self-improvement."],
    
    body: ["The bar is low on purpose.", "Boring is good.", "Consistency beats intensity."],
    pills: [
      "Water",
      "One easy food",
      "Fresh air (60 seconds)",
      "Clean face",
      "Change shirt",
      "Brush teeth (even 20 seconds)",
      "Take meds if applicable",
    ],
    steps: {
      "1": ["Drink water.", "Change posture.", "Look at a window or light."],
      "10": ["Water.", "Food.", "Clean face.", "Fresh air for 60 seconds."],
      "30": ["Water + food.", "Shower or wash face.", "Change clothes.", "Tidy one surface."],
    },
  },

  {
    id: "stillhere",
    title: "Still here",
    blurb: "A gentle closing.",
    body: ["You don’t have to understand your life today.", "You’re still allowed to be here."],
    steps: {
      "1": ["One slow exhale.", "Whisper: “I’m still here.”", "That’s enough."],
      "10": ["Water.", "Sit somewhere softer.", "One kind sentence to yourself."],
      "30": ["Food + water.", "Small comfort: blanket, music, warmth.", "Set tomorrow up by 1%."],
    },
    actions: [{ label: "Close everything", kind: "close" }],
  },
];

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-[var(--muted)]">{children}</div>
    </section>
  );
}

function Pill({ children }) {
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs text-[var(--muted)]">
      {children}
    </span>
  );
}

export default function SheasGarden() {
  const [openId, setOpenId] = useState(null);
  const [intensity, setIntensity] = useState("1");

  const openSection = useMemo(() => SECTIONS.find((s) => s.id === openId), [openId]);

  const closeAll = () => {
    setOpenId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const steps = openSection?.steps?.[intensity] || [];

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-4xl px-5 py-10">
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Garden of Hope and Understanding
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              A small place to land when you’re not okay. No pressure. No performance.
            </p>
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              Built by Shea • for anyone who needs a gentler next step
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            >
              ← Home
            </Link>

            {/* Rename Lyra link to a generic public utility */}
            <Link
              to="/decision-board"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
              title="A simple board for decisions, pros/cons, and next steps"
            >
              Decision Board →
            </Link>
          </div>
        </header>

        {/* Intensity toggle */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="text-xs text-[var(--muted)] mr-2">How much do you have?</div>
          {INTENSITIES.map((x) => (
            <button
              key={x.id}
              onClick={() => setIntensity(x.id)}
              className={`rounded-full border px-4 py-2 text-xs shadow-sm transition
                border-[var(--border)] bg-[var(--bg-elev)]
                ${intensity === x.id ? "opacity-100" : "opacity-85 hover:opacity-100"}`}
              type="button"
              title={x.hint}
            >
              {x.label}
            </button>
          ))}
        </div>

        {/* Door selector */}
        <div className="mt-4 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setOpenId((prev) => (prev === s.id ? null : s.id))}
              className={`rounded-full border px-4 py-2 text-xs shadow-sm transition
                border-[var(--border)] bg-[var(--bg-elev)]
                ${openId === s.id ? "opacity-100" : "opacity-90 hover:opacity-100"}`}
              type="button"
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-6 grid grid-cols-1 gap-4">
          {!openSection && (
            <Card title="Pick the door that matches the moment">
              <p>
                You’re not committing to a new life. You’re just choosing what kind of support you
                want right now.
              </p>
              <p className="mt-2">
                If you’re not sure, start with: <span className="font-medium text-[var(--text)]">When the day feels impossible</span>.
              </p>
            </Card>
          )}

          {openSection && (
            <Card title={openSection.title}>
              {openSection.blurb ? <p className="text-sm">{openSection.blurb}</p> : null}

              {openSection.body?.length ? (
                <div className="mt-3">
                  {openSection.body.map((line, idx) => (
                    <p key={idx} className={idx === 0 ? "" : "mt-2"}>
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}

              {/* Do-this-now steps */}
              {steps.length ? (
                <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                  <div className="text-xs text-[var(--muted)]">Do this now ({INTENSITIES.find(i => i.id === intensity)?.label})</div>
                  <ol className="mt-2 list-decimal pl-5 text-sm text-[var(--muted)]">
                    {steps.map((st) => (
                      <li key={st} className="mt-1">
                        {st}
                      </li>
                    ))}
                  </ol>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => closeAll()}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                      type="button"
                      title="Collapse everything"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                      type="button"
                      title="Go back to the top"
                    >
                      Back to doors
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Q/A */}
              {openSection.qa?.length ? (
                <div className="mt-4 space-y-3">
                  {openSection.qa.map((item) => (
                    <details
                      key={item.q}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3"
                    >
                      <summary className="cursor-pointer text-sm font-medium text-[var(--text)]">
                        {item.q}
                      </summary>
                      <p className="mt-2 text-sm text-[var(--muted)] leading-6">{item.a}</p>
                    </details>
                  ))}
                </div>
              ) : null}

              {/* Work checklist blocks */}
              {openSection.checklist?.length ? (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {openSection.checklist.map((block) => (
                    <div
                      key={block.title}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4"
                    >
                      <h3 className="text-sm font-semibold">{block.title}</h3>
                      <ul className="mt-2 list-disc pl-4 text-sm text-[var(--muted)]">
                        {block.items.map((it) => (
                          <li key={it}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Pills */}
              {openSection.pills?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {openSection.pills.map((p) => (
                    <Pill key={p}>{p}</Pill>
                  ))}
                </div>
              ) : null}

              {/* Optional actions (close everything) */}
              {openSection.actions?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {openSection.actions.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => {
                        if (a.kind === "close") closeAll();
                      }}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                      type="button"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </Card>
          )}
        </div>

        <footer className="mt-10 text-xs text-[var(--muted)]">
          This is allowed to be simple. This is allowed to be enough.
        </footer>
      </div>
    </main>
  );
}