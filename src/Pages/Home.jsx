// src/Pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
 
const LS_KEY = "pe_home_v2";
 
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
  } catch {}
}
 
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
    id: "shared-stillness",
    title: "Shared Stillness",
    desc: "Take a moment with your people, daily.",
    to: "/stillness",
    tags: ["shared", "moment"],
    isPublic: true,
    isFeatured: true,
    updatedAtISO: "2026-04-06",
    requiresAuth: false,
  },
  {
    id: "skipped-step",
    title: "The Step We Skip",
    desc: "Find what you're skipping, then decide with less regret.",
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
    desc: "Map a trigger → choice → behavior → ripple. Just to see it.",
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
    desc: "Share your vision of a better world and read what others have shared.",
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
    desc: "Customize your page with experimental widgets.",
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
 
function Pill({ children, className = "" }) {
  return (
    <span
      className={
        "rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-[11px] text-[var(--muted)] " +
        className
      }
    >
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
 
function pickFeatured(experiments) {
  const featured = experiments.filter((e) => e.isFeatured && e.isPublic);
  if (featured.length) return featured[0];
  const sorted = [...experiments]
    .filter((e) => e.isPublic)
    .sort((a, b) => (b.updatedAtISO || "").localeCompare(a.updatedAtISO || ""));
  return sorted[0] || null;
}
 
export default function Home() {
  const navigate = useNavigate();
  const { isLoggedIn, displayName } = useAuth?.() || { isLoggedIn: false, displayName: null };
 
  const initial = useMemo(() => {
    const stored = loadState();
    return (
      stored || {
        lastExperimentId: null,
        pinnedExperimentId: null,
        hiddenExperimentIds: [],
        createdAtISO: new Date().toISOString().slice(0, 10),
        version: 2,
      }
    );
  }, []);
 
  const [lastExperimentId, setLastExperimentId] = useState(initial.lastExperimentId);
  const [pinnedExperimentId, setPinnedExperimentId] = useState(initial.pinnedExperimentId);
  const [hiddenExperimentIds, setHiddenExperimentIds] = useState(initial.hiddenExperimentIds || []);
 
  useEffect(() => {
    saveState({
      lastExperimentId,
      pinnedExperimentId,
      hiddenExperimentIds,
      createdAtISO: initial.createdAtISO,
      version: 2,
    });
  }, [lastExperimentId, pinnedExperimentId, hiddenExperimentIds]);
 
  const visibleExperiments = useMemo(() => {
    return EXPERIMENTS.filter((e) => e.isPublic && !hiddenExperimentIds.includes(e.id));
  }, [hiddenExperimentIds]);
 
  const featured = useMemo(() => pickFeatured(visibleExperiments), [visibleExperiments]);
 
  const lastExperiment = useMemo(() => {
    if (!lastExperimentId) return null;
    return EXPERIMENTS.find((e) => e.id === lastExperimentId) || null;
  }, [lastExperimentId]);
 
  const pinned = useMemo(() => {
    if (!pinnedExperimentId) return null;
    return EXPERIMENTS.find((e) => e.id === pinnedExperimentId) || null;
  }, [pinnedExperimentId]);
 
  const canAccess = (exp) => !(exp?.requiresAuth && !isLoggedIn);
 
  const openOrLogin = (exp) => {
    if (!exp) return;
    if (!canAccess(exp)) {
      navigate(`/login?next=${encodeURIComponent(exp.to)}`);
      return;
    }
    setLastExperimentId(exp.id);
    navigate(exp.to);
  };
 
  const showContinue = isLoggedIn && lastExperiment && canAccess(lastExperiment);
 
  const onPin = (exp) => {
    setPinnedExperimentId((prev) => (prev === exp.id ? null : exp.id));
  };
 
  const onHide = (exp) => {
    setHiddenExperimentIds((prev) => {
      if (prev.includes(exp.id)) return prev;
      return [exp.id, ...prev];
    });
  };
 
  const scrollToTools = () => {
    const el = document.getElementById("tools");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
 
  const restoreHidden = () => {
    setHiddenExperimentIds([]);
  };
 
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-5xl px-5 py-10">
 
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
  <div className="space-y-2">
    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
      Small tools that reduce mental loops—alone, and together.
    </h1>

    <p className="text-sm text-[var(--muted)] leading-6 max-w-prose">
      PneumEvolve is a collection of standalone pages that help you think, decide, and notice patterns.
    </p>

    {isLoggedIn ? (
      <p className="text-[11px] text-[var(--muted)]">
        Signed in{displayName ? ` as ${displayName}` : ""}. Continue/pin/hide saves locally on this device.
      </p>
    ) : (
      <p className="text-[11px] text-[var(--muted)]">
        No account required for most tools. Some are optionally gated.
      </p>
    )}
  </div>

  <div className="flex flex-wrap gap-2 sm:justify-end sm:shrink-0">
    <button
      type="button"
      onClick={scrollToTools}
      className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
    >
      Browse tools →
    </button>
    {isLoggedIn ? (
      <PrimaryLink to="/account">Account</PrimaryLink>
    ) : (
      <>
        <PrimaryLink to="/login">Log in</PrimaryLink>
        <PrimaryLink to="/signup">Create account</PrimaryLink>
      </>
    )}
  </div>
</header>
 
        {/* ── Top row: Featured + Continue/What this is + Pinned ───────── */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card
            title="Featured"
            subtitle={featured ? "Start here if you're not sure." : "Add one when you're ready."}
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
                    {featured.requiresAuth ? <Pill className="opacity-80">🔒 login</Pill> : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openOrLogin(featured)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                  >
                    {canAccess(featured) ? "Open →" : "Log in to open →"}
                  </button>
                  <SmallButton onClick={() => onPin(featured)}>
                    {pinnedExperimentId === featured.id ? "Unpin" : "Pin"}
                  </SmallButton>
                  <SmallButton onClick={() => onHide(featured)}>Hide</SmallButton>
                </div>
              </>
            ) : (
              <>
                <p>No tools are visible right now.</p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={scrollToTools}
                    className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                  >
                    Browse tools →
                  </button>
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
                  <button
                    type="button"
                    onClick={() => openOrLogin(lastExperiment)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                  >
                    Continue →
                  </button>
                  <SmallButton onClick={() => setLastExperimentId(null)}>Clear</SmallButton>
                </div>
              </>
            ) : (
              <>
                <p>
                  Each tool is a standalone page. You can dip in for two minutes or stay longer.
                  Nothing tracks you unless you choose to save.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={scrollToTools}
                    className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                  >
                    Browse tools →
                  </button>
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
                <div className="mt-2 flex flex-wrap gap-2">
                  {(pinned.tags || []).map((t) => (
                    <Pill key={t}>{t}</Pill>
                  ))}
                  {pinned.requiresAuth ? <Pill className="opacity-80">🔒 login</Pill> : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openOrLogin(pinned)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                  >
                    {canAccess(pinned) ? "Open →" : "Log in to open →"}
                  </button>
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
 
        {/* ── Tools list ───────────────────────────────────────────────── */}
        {/*
          CHANGED: "All experiments" → "Tools" with a warmer subtitle.
          Also renamed the scroll anchor id from "experiments" to "tools"
          to match the updated CTA button label above.
        */}
        <div className="mt-6 grid grid-cols-1 gap-4">
          <div id="tools">
            <Card
              title="Tools"
              subtitle="Short. Standalone. Dip in and leave whenever."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleExperiments.map((exp) => {
                  const locked = exp.requiresAuth && !isLoggedIn;
                  return (
                    <div
                      key={exp.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--text)]">{exp.title}</p>
                            {exp.requiresAuth ? <Pill className="opacity-80">🔒 login</Pill> : null}
                          </div>
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
                        <button
                          type="button"
                          onClick={() => openOrLogin(exp)}
                          className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                        >
                          {locked ? "Log in to open →" : "Open →"}
                        </button>
                        <SmallButton onClick={() => onHide(exp)}>Hide</SmallButton>
                      </div>
                    </div>
                  );
                })}
              </div>
 
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                {hiddenExperimentIds.length ? (
                  <SmallButton onClick={restoreHidden}>Restore hidden</SmallButton>
                ) : (
                  <span className="text-[11px] text-[var(--muted)]">
                    Tip: hide anything you don't need right now.
                  </span>
                )}
              </div>
            </Card>
          </div>
        </div>
 
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[var(--muted)]">
          <span>Imperfect is the point.</span>
          <div className="flex gap-3">
            <Link className="hover:underline" to="/sitemap">
              Sitemap
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}