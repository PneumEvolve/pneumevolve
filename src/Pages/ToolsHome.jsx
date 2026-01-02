// src/Pages/ToolsHome.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { loadHomeWidgets, saveHomeWidgets } from "@/utils/homeWidgets";
import { WIDGET_BY_ID } from "@/Widgets/homeWidgetRegistry";

function moveItem(arr, fromIndex, toIndex) {
  const copy = [...arr];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, item);
  return copy;
}

export default function ToolsHome() {
  const [widgetIds, setWidgetIds] = useState(() => loadHomeWidgets());

  const widgets = useMemo(
    () => widgetIds.map((id) => WIDGET_BY_ID[id]).filter(Boolean),
    [widgetIds]
  );

  const remove = (id) => {
    const next = widgetIds.filter((x) => x !== id);
    setWidgetIds(next);
    saveHomeWidgets(next);
  };

  const reorder = (from, to) => {
    const next = moveItem(widgetIds, from, to);
    setWidgetIds(next);
    saveHomeWidgets(next);
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Tools
            </h1>
            <p className="text-sm text-[var(--muted)]">
              Your home tools (local-only).
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            >
              ← Home
            </Link>
            <Link
              to="/tools/library"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            >
              Add / manage widgets
            </Link>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/relief"
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
          >
            Relief
          </Link>
          <Link
            to="/flow"
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
          >
            Flow Map
          </Link>
          <Link
            to="/sitemap"
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
          >
            Site Map
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {widgets.length === 0 ? (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm">
              <h2 className="text-base font-semibold">No tools added yet</h2>
              <p className="mt-2 text-sm text-[var(--muted)] leading-6">
                Add one or two tools to start. Keep it light.
              </p>
              <div className="mt-4">
                <Link
                  to="/tools/library"
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition inline-block"
                >
                  Open widget library
                </Link>
              </div>
            </section>
          ) : null}

          {widgets.map((w, index) => (
            <div key={w.id} className="relative">
              {/* tiny controls above the widget */}
              <div className="mb-2 flex items-center gap-2 text-xs text-[var(--muted)]">
                <span className="font-medium text-[var(--text)]">{w.title}</span>
                <span className="opacity-70">•</span>
                <button
                  type="button"
                  onClick={() => remove(w.id)}
                  className="hover:text-[var(--text)] transition"
                >
                  Remove
                </button>
                <span className="opacity-70">•</span>
                <button
                  type="button"
                  onClick={() => index > 0 && reorder(index, index - 1)}
                  disabled={index === 0}
                  className="hover:text-[var(--text)] transition disabled:opacity-40"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => index < widgets.length - 1 && reorder(index, index + 1)}
                  disabled={index >= widgets.length - 1}
                  className="hover:text-[var(--text)] transition disabled:opacity-40"
                >
                  Down
                </button>
              </div>

              {w.render()}
            </div>
          ))}
        </div>

        <footer className="mt-10 text-xs text-[var(--muted)]">
          Tools save locally in your browser unless a page explicitly says otherwise.
        </footer>
      </div>
    </main>
  );
}