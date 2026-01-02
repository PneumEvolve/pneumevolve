// src/Pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * PneumEvolve Home (structured for "Experiments first")
 *
 * Goals:
 * - Public: shows the latest featured experiment + link to all experiments
 * - Signed in: same, but remembers your last opened experiment locally and offers "Continue"
 * - Keeps it simple: no promises, no pressure, no "self-help app" vibe
 *
 * Notes:
 * - Uses localStorage for "last seen / pinned / dismissed" so it works without backend.
 * - If you later add a DB, this structure still holds; you just swap the storage layer.
 */

const LS_KEY = "pe_home_v1";

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

/**
 * Experiments registry (MVP: hardcoded)
 * Later: move this to /src/data/experiments.js or fetch from API.
 *
 * Keep each experiment:
 * - one page
 * - one sentence hook
 * - one action
 */
const EXPERIMENTS = [
  {
    id: "preforge-local",
    title: "Pre-Forge",
    desc: "An idea and problem clarifier and organizer.",
    to: "/preforge",
    tags: ["organize", "clarity"],
    isPublic: true,
    isFeatured: true,
    updatedAtISO: "2026-01-02",
    requiresAuth: false,
  },
  {
    id: "skipped-step",
    title: "The Step We Skip",
    desc: "A small decision tool: find what you’re skipping, then decide with less regret.",
    to: "/skipped-step",
    tags: ["decisions", "clarity"],
    isPublic: true,
    isFeatured: false,
    updatedAtISO: "2026-01-02",
    requiresAuth: false,
  },
  {
    id: "decision-board",
    title: "Decision Board",
    desc: "Put pros/cons somewhere real so they stop looping in your head.",
    to: "/decision-board",
    tags: ["decisions"],
    isPublic: true,
    isFeatured: false,
    updatedAtISO: "2026-01-02",
    requiresAuth: false,
  },
  {
    id: "flow-map",
    title: "Flow Map",
    desc: "Map a trigger → choice → behavior → ripple. Not to judge it—just to see it.",
    to: "/flow",
    tags: ["patterns", "behavior"],
    isPublic: true,
    isFeatured: false,
    updatedAtISO: "2026-01-02",
    requiresAuth: false,
  },
  {
    id: "dream-machine",
    title: "Dream Machine",
    desc: "Submit your vision of a better world and read the collectives shared vision so far.",
    to: "/experiments/dream-machine",
    tags: ["wonder", "together"],
    isPublic: true,
    isFeatured: false,
    updatedAtISO: "2026-01-02",
    requiresAuth: true,
  },
  {
    id: "widget-board",
    title: "Widget Board",
    desc: "Customize your page with our experimental widgets.",
    to: "/tools",
    tags: ["customize", "widgets"],
    isPublic: true,
    isFeatured: false,
    updatedAtISO: "2026-01-02",
    requiresAuth: false,
  },
];

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

function Pill({ children }) {
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-[11px] text-[var(--muted)]">
      {children}
    </span>
  );
}

function SmallButton({ children, onClick, type = "button", className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={
        "rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition " +
        className
      }
    >
      {children}
    </button>
  );
}

function PrimaryLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
    >
      {children}
    </Link>
  );
}

function PrimaryCTA({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
    >
      {children}
    </Link>
  );
}

function pickFeatured(experiments) {
  const featured = experiments.filter((e) => e.isFeatured && e.isPublic);
  if (featured.length) return featured[0];

  // fallback: newest by updatedAtISO (string compare OK for YYYY-MM-DD)
  const sorted = [...experiments]
    .filter((e) => e.isPublic)
    .sort((a, b) => (b.updatedAtISO || "").localeCompare(a.updatedAtISO || ""));
  return sorted[0] || null;
}

export default function Home() {
  const { isLoggedIn, displayName } = useAuth?.() || { isLoggedIn: false, displayName: null };

  const initial = useMemo(() => {
    const stored = loadState();
    return (
      stored || {
        lastExperimentId: null,
        pinnedExperimentId: null,
        dismissedExperimentIds: [],
        createdAtISO: new Date().toISOString().slice(0, 10),
        version: 1,
      }
    );
  }, []);

  const [lastExperimentId, setLastExperimentId] = useState(initial.lastExperimentId);
  const [pinnedExperimentId, setPinnedExperimentId] = useState(initial.pinnedExperimentId);
  const [dismissedExperimentIds, setDismissedExperimentIds] = useState(
    initial.dismissedExperimentIds || []
  );

  useEffect(() => {
    saveState({
      lastExperimentId,
      pinnedExperimentId,
      dismissedExperimentIds,
      createdAtISO: initial.createdAtISO,
      version: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastExperimentId, pinnedExperimentId, dismissedExperimentIds]);

  const visibleExperiments = useMemo(() => {
    return EXPERIMENTS.filter((e) => e.isPublic && !dismissedExperimentIds.includes(e.id));
  }, [dismissedExperimentIds]);

  const featured = useMemo(() => pickFeatured(visibleExperiments), [visibleExperiments]);

  const lastExperiment = useMemo(() => {
    if (!lastExperimentId) return null;
    return EXPERIMENTS.find((e) => e.id === lastExperimentId) || null;
  }, [lastExperimentId]);

  const pinned = useMemo(() => {
    if (!pinnedExperimentId) return null;
    return EXPERIMENTS.find((e) => e.id === pinnedExperimentId) || null;
  }, [pinnedExperimentId]);

  const showContinue = isLoggedIn && lastExperiment && lastExperiment.isPublic;

  const onOpenExperiment = (exp) => {
    setLastExperimentId(exp.id);
  };

  const onPin = (exp) => {
    setPinnedExperimentId((prev) => (prev === exp.id ? null : exp.id));
  };

  const onDismiss = (exp) => {
    setDismissedExperimentIds((prev) => {
      if (prev.includes(exp.id)) return prev;
      return [exp.id, ...prev];
    });
    if (featured?.id === exp.id) {
      // if you dismiss featured, keep lastExperimentId untouched; featured will fall back automatically
    }
  };

  const restoreDismissed = () => {
    setDismissedExperimentIds([]);
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-5xl px-5 py-10">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">PneumEvolve</h1>

            <p className="text-sm text-[var(--muted)] leading-6 max-w-prose">
              An experiment in thinking more clearly—alone, and together.
            </p>

            {isLoggedIn ? (
              <p className="text-[11px] text-[var(--muted)]">
                Signed in{displayName ? ` as ${displayName}` : ""}. Your “continue” state saves
                locally on this device.
              </p>
            ) : (
              <p className="text-[11px] text-[var(--muted)]">
                No account required for experiments. Some tools may offer optional sign-in later.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <PrimaryLink to="/sitemap">Explore</PrimaryLink>
            {isLoggedIn ? (
              <PrimaryLink to="/account">Account</PrimaryLink>
            ) : (
              <>
                <PrimaryLink to="/login">Log in</PrimaryLink>
                <PrimaryCTA to="/signup">Create account</PrimaryCTA>
              </>
            )}
          </div>
        </header>

        {/* Top row: Featured + Continue */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card
            title={featured ? "Featured experiment" : "Featured experiment"}
            subtitle={featured ? "Start here if you’re not sure." : "Add one when you’re ready."}
          >
            {featured ? (
              <>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-[var(--text)]">{featured.title}</p>
                  <p>{featured.desc}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(featured.tags || []).map((t) => (
                      <Pill key={t}>{t}</Pill>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={featured.to}
                    onClick={() => onOpenExperiment(featured)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                  >
                    Open →
                  </Link>

                  <SmallButton onClick={() => onPin(featured)}>
                    {pinnedExperimentId === featured.id ? "Unpin" : "Pin"}
                  </SmallButton>

                  <SmallButton onClick={() => onDismiss(featured)}>Dismiss</SmallButton>
                </div>
              </>
            ) : (
              <>
                <p>No experiments are visible right now.</p>
                <div className="mt-3">
                  <PrimaryLink to="/experiments">View all experiments(old)</PrimaryLink>
                </div>
              </>
            )}
          </Card>

          <Card
            title={showContinue ? "Continue" : "What this is"}
            subtitle={showContinue ? "Pick up where you left off." : "No pressure. No promises."}
          >
            {showContinue ? (
              <>
                <p className="text-base font-semibold text-[var(--text)]">{lastExperiment.title}</p>
                <p>{lastExperiment.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={lastExperiment.to}
                    onClick={() => onOpenExperiment(lastExperiment)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                  >
                    Continue →
                  </Link>
                  <SmallButton onClick={() => setLastExperimentId(null)}>Clear</SmallButton>
                </div>
              </>
            ) : (
              <>
                <p>
                  PneumEvolve is a collection of small experiments—pages that help you think,
                  decide, and notice patterns.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <PrimaryCTA to="/experiments">All experiments(old) →</PrimaryCTA>
                  <PrimaryLink to="/tools">Widget Board →</PrimaryLink>
                </div>
              </>
            )}
          </Card>

          <Card
            title={pinned ? "Pinned" : "Quick start"}
            subtitle={pinned ? "One thing you chose to keep close." : "A tiny reset, no tracking."}
          >
            {pinned ? (
              <>
                <p className="text-base font-semibold text-[var(--text)]">{pinned.title}</p>
                <p>{pinned.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={pinned.to}
                    onClick={() => onOpenExperiment(pinned)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                  >
                    Open →
                  </Link>
                  <SmallButton onClick={() => setPinnedExperimentId(null)}>Unpin</SmallButton>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">
                  Drop your shoulders. Slow inhale. Longer exhale. Repeat twice.
                </p>
                <p className="mt-3 text-[11px] text-[var(--muted)]">
                  No saving. No tracking. Just a breath.
                </p>
              </>
            )}
          </Card>
        </div>

        {/* Experiments list */}
        <div className="mt-6 grid grid-cols-1 gap-4">
          <Card
            title="All experiments (public)"
            subtitle="Short. Standalone. You can dip in and leave."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleExperiments.map((exp) => (
                <div
                  key={exp.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">{exp.title}</p>
                      <p className="mt-1 text-sm text-[var(--muted)] leading-6">{exp.desc}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(exp.tags || []).map((t) => (
                          <Pill key={t}>{t}</Pill>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onPin(exp)}
                      className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-[11px] font-medium shadow-sm hover:shadow transition"
                      aria-label={pinnedExperimentId === exp.id ? "Unpin" : "Pin"}
                      title={pinnedExperimentId === exp.id ? "Unpin" : "Pin"}
                    >
                      {pinnedExperimentId === exp.id ? "Pinned" : "Pin"}
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to={exp.to}
                      onClick={() => onOpenExperiment(exp)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                    >
                      Open →
                    </Link>
                    <SmallButton onClick={() => onDismiss(exp)}>Dismiss</SmallButton>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <PrimaryLink to="/experiments">Experiments page →</PrimaryLink>
                <PrimaryLink to="/sitemap">Sitemap →</PrimaryLink>
              </div>

              {dismissedExperimentIds.length ? (
                <SmallButton onClick={restoreDismissed}>Restore dismissed</SmallButton>
              ) : (
                <span className="text-[11px] text-[var(--muted)]">
                  Tip: dismiss things you don’t want to see.
                </span>
              )}
            </div>
          </Card>
        </div>

        <footer className="mt-10 text-[11px] text-[var(--muted)]">
          Experiments are allowed to be imperfect. So are you.
        </footer>
      </div>
    </main>
  );
}