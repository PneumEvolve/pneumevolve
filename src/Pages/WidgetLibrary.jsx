// src/Pages/WidgetLibrary.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { HOME_WIDGETS, WIDGET_BY_ID } from "@/widgets/homeWidgetRegistry";
import { loadHomeWidgets, saveHomeWidgets } from "@/utils/homeWidgets";

export default function WidgetLibrary() {
  const [selected, setSelected] = useState(() => loadHomeWidgets());

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (id) => {
    const next = selectedSet.has(id)
      ? selected.filter((x) => x !== id)
      : [id, ...selected];
    setSelected(next);
    saveHomeWidgets(next);
  };

  const clearAll = () => {
    setSelected([]);
    saveHomeWidgets([]);
  };

  const addRecommended = () => {
    const recommended = ["checkin", "notes", "buildSprint"];
    const next = Array.from(new Set([...recommended, ...selected]));
    setSelected(next);
    saveHomeWidgets(next);
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Widget Library
            </h1>
            <p className="text-sm text-[var(--muted)]">
              Add tools to your Tools page (local-only).
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/tools"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            >
              ← Back to Tools
            </Link>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
              title="Remove all widgets from Tools home"
            >
              Clear all
            </button>
          </div>
        </header>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addRecommended}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
          >
            Add recommended (3)
          </button>

          <div className="text-xs text-[var(--muted)] self-center">
            Selected: <span className="font-medium text-[var(--text)]">{selected.length}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {HOME_WIDGETS.map((w) => {
            const on = selectedSet.has(w.id);
            return (
              <section
                key={w.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">{w.title}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)] leading-6">
                      {w.desc}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggle(w.id)}
                    className={`rounded-xl border px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition
                      border-[var(--border)] ${on ? "bg-[var(--bg)]" : "bg-[var(--bg)]"}`}
                  >
                    {on ? "Remove" : "Add"}
                  </button>
                </div>

                {/* Optional quick preview toggle later. Keeping v1 simple. */}
                <p className="mt-4 text-[11px] text-[var(--muted)]">
                  Widget id: {w.id}
                </p>
              </section>
            );
          })}
        </div>

        <footer className="mt-10 text-xs text-[var(--muted)]">
          Your selection is saved locally in your browser.
        </footer>
      </div>
    </main>
  );
}