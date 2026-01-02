// src/Pages/Relief.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-[var(--muted)]">{children}</div>
    </section>
  );
}

function SmallButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
    >
      {children}
    </button>
  );
}

export default function Relief() {
  const [step, setStep] = useState(null); // "30s" | "10m"
  const [choice, setChoice] = useState(null);

  const TEN_MIN_CHOICES = [
    {
      id: "body",
      title: "Body",
      detail: "Water + one bite of food + 60 seconds of air. That’s a win.",
    },
    {
      id: "space",
      title: "Space",
      detail: "Set a 2-minute timer. Clear one small surface or toss 5 items.",
    },
    {
      id: "mind",
      title: "Mind",
      detail: "Write one sentence: “Right now I feel ___ because ___.” Stop there.",
    },
    {
      id: "connect",
      title: "Connection",
      detail: "Send: “Hey. Hard day. No need to reply fast.”",
    },
  ];

  const reset = () => {
    setStep(null);
    setChoice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-4xl px-5 py-10">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Relief
            </h1>
            <p className="text-sm text-[var(--muted)]">
              No fixing your life. Just stabilizing.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            >
              ← Home
            </Link>
            <button
              onClick={reset}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
              type="button"
            >
              Reset
            </button>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <Card title="30-second reset">
            <p>Drop your shoulders.</p>
            <p className="mt-2">
              Inhale slowly. Exhale a little longer. Do that twice.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <SmallButton onClick={() => setStep("30s")}>I did it</SmallButton>
              <SmallButton onClick={() => setStep("10m")}>Go to 10 minutes</SmallButton>
            </div>
          </Card>

          <Card title="10 minutes (pick one)">
            <p>One is enough. No bonus points for doing more.</p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEN_MIN_CHOICES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setStep("10m");
                    setChoice(c.id);
                  }}
                  className={`rounded-xl border p-4 text-left shadow-sm transition
                    border-[var(--border)] bg-[var(--bg)]
                    ${choice === c.id ? "opacity-100" : "opacity-90 hover:opacity-100"}`}
                >
                  <div className="text-sm font-semibold">{c.title}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{c.detail}</div>
                </button>
              ))}
            </div>

            {choice ? (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <div className="text-xs text-[var(--muted)]">Your 10-minute move</div>
                <div className="mt-1 text-sm font-semibold">
                  {TEN_MIN_CHOICES.find((x) => x.id === choice)?.detail}
                </div>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  When you finish: come back and hit “Done”.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <SmallButton onClick={() => reset()}>Done</SmallButton>
                  <SmallButton onClick={() => setChoice(null)}>Pick a different one</SmallButton>
                </div>
              </div>
            ) : null}
          </Card>

          <Card title="Basic supports (quiet, practical)">
            <div className="flex flex-wrap gap-2">
              {["Water", "One easy food", "Meds (if applicable)", "Bathroom", "Fresh air 60s"].map(
                (x) => (
                  <span
                    key={x}
                    className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs text-[var(--muted)]"
                  >
                    {x}
                  </span>
                )
              )}
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">
              This page doesn’t save anything. It’s intentionally disposable.
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}