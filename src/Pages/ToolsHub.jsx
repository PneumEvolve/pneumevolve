// src/Pages/ToolsHub.jsx
import React from "react";
import { Link } from "react-router-dom";
import useLocalStorageState from "../utils/useLocalStorageState";

import CheckInWidget from "../Widgets/CheckInWidget";
import NotesWidget from "../Widgets/NotesWidget";
import LinksWidget from "../Widgets/LinksWidget";
import DecideWidget from "../Widgets/DecideWidget";
import BuildSprintWidget from "../Widgets/BuildSprintWidget";
import ExploreCompassWidget from "../Widgets/ExploreCompassWidget";
import LearningOrganizerWidget from "../Widgets/LearningOrganizerWidget";

const MODES = ["Today", "Tools"];

export default function ToolsHub() {
  const [activeMode, setActiveMode] = useLocalStorageState(
    "pe_tools_active_mode_v1",
    "Today"
  );

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Tools
              </h1>
              <p className="text-sm text-[var(--muted)]">
                Local-save workspace. No account required.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                to="/"
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)]
                           px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
              >
                ← Home
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)]
                           px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
              >
                Log in (optional)
              </Link>
            </div>
          </div>

          {/* Mode selector */}
          <div className="flex flex-wrap gap-2 pt-2">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setActiveMode(m)}
                className={`rounded-full border px-4 py-2 text-xs shadow-sm transition
                  border-[var(--border)] bg-[var(--bg-elev)]
                  ${activeMode === m ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
                type="button"
              >
                {m}
              </button>
            ))}
          </div>

          {/* Quick portals */}
          <div className="flex flex-wrap gap-2 pt-3">
            <Link
              to="/journal"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)]
                         px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            >
              Journal
            </Link>

            <Link
              to="/garden"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)]
                         px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            >
              Garden of Understanding
            </Link>

            <Link
              to="/forge2"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)]
                         px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
              title="If this becomes a community feature later, we can gate it."
            >
              Forge
            </Link>
          </div>

          <p className="pt-1 text-[11px] text-[var(--muted)]">
            Saved locally • clearing browser storage clears your tools.
          </p>
        </header>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeMode === "Today" && (
            <>
              <CheckInWidget storageKey="pe_checkin_v1" title="Quick check-in" />
              <BuildSprintWidget storageKey="pe_build_sprint_v1" />
              <NotesWidget storageKey="pe_notes_today_v1" title="Quick note" />
            </>
          )}

          {activeMode === "Tools" && (
            <>
              <DecideWidget storageKey="pe_decide_v2" />
              <ExploreCompassWidget storageKey="pe_explore_compass_v1" />
              <LearningOrganizerWidget storageKey="pe_learning_stack_v1" />
              <LinksWidget storageKey="pe_links_tools_v1" title="My links" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}