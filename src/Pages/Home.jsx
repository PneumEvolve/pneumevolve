// src/Pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const LS_KEY = "pe_home_v2";

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Migrate old single pinnedToolId to array
    if (parsed.pinnedToolId && !parsed.pinnedToolIds) {
      parsed.pinnedToolIds = [parsed.pinnedToolId];
      delete parsed.pinnedToolId;
    }
    return parsed;
  } catch { return null; }
}

function saveState(next) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
}

// ─── Tool registry ────────────────────────────────────────────────────────────
const TOOLS = [
  // Stillness
  {
    id: "clear-and-calm",
    title: "Clear & Calm",
    desc: "Ride out cravings with breathing. Build a daily meditation practice. Track the shift.",
    to: "/clear-and-calm",
    tags: ["breath", "habit"],
    category: "stillness",
    isPublic: true,
    isFeatured: true,
    updatedAtISO: "2026-05-15",
    requiresAuth: true,
    isNew: true,
  },
  {
    id: "shared-stillness",
    title: "Shared Stillness",
    desc: "Take a moment with your people, daily. No words. Just presence across the miles.",
    to: "/stillness",
    tags: ["shared", "moment"],
    category: "stillness",
    isPublic: true,
    isFeatured: false,
    updatedAtISO: "2026-04-06",
    requiresAuth: false,
  },

  // Clarity
  {
    id: "preforge-local",
    title: "Pre-Forge",
    desc: "An idea and problem clarifier. Get it out of your head and into something real.",
    to: "/preforge",
    tags: ["organize", "clarity"],
    category: "clarity",
    isPublic: true,
    isFeatured: false,
    updatedAtISO: "2026-01-02",
    requiresAuth: false,
  },
  {
    id: "decision-board",
    title: "Decision Board",
    desc: "Put pros and cons somewhere real so they stop looping in your head.",
    to: "/decision-board",
    tags: ["decisions"],
    category: "clarity",
    isPublic: true,
    isFeatured: false,
    updatedAtISO: "2026-01-02",
    requiresAuth: false,
  },
  {
    id: "flow-map",
    title: "Flow Map",
    desc: "Map a trigger → choice → behavior → ripple. Just to see it clearly.",
    to: "/flow",
    tags: ["patterns", "behavior"],
    category: "clarity",
    isPublic: true,
    isFeatured: false,
    updatedAtISO: "2026-01-02",
    requiresAuth: false,
  },
  {
    id: "skipped-step",
    title: "The Step We Skip",
    desc: "Find what you're skipping, then decide with less regret.",
    to: "/skipped-step",
    tags: ["decisions", "clarity"],
    category: "clarity",
    isPublic: true,
    isFeatured: false,
    updatedAtISO: "2026-01-02",
    requiresAuth: false,
  },
  // Life
  {
    id: "projects",
    title: "Projects",
    desc: "Organize tasks and personal goals. Keep track of what you're actually working on.",
    to: "/projects",
    tags: ["organize", "goals"],
    category: "life",
    isPublic: true,
    isFeatured: false,
    updatedAtISO: "2026-04-10",
    requiresAuth: true,
  },
  {
    id: "meal-planner",
    title: "Meal Planner",
    desc: "Plan your meals for the week. Syncs with your pantry and recipe collection.",
    to: "/meal-planning",
    tags: ["food", "planning"],
    category: "life",
    isPublic: true,
    isFeatured: false,
    updatedAtISO: "2026-04-11",
    requiresAuth: true,
  },
  {
    id: "widget-board",
    title: "Mini-tools",
    desc: "A personal page of mini-tools. Add what you need, hide the rest.",
    to: "/tools",
    tags: ["customize", "personal"],
    category: "life",
    isPublic: true,
    isFeatured: false,
    updatedAtISO: "2026-04-10",
    requiresAuth: false,
  },
  // Together
  {
    id: "dream-machine",
    title: "Dream Machine",
    desc: "Share your vision of a better world and read what others have shared.",
    to: "/experiments/dream-machine",
    tags: ["wonder", "together"],
    category: "together",
    isPublic: false,
    isFeatured: false,
    updatedAtISO: "2026-01-02",
    requiresAuth: true,
  },
];

const CATEGORIES = [
  {
    id: "stillness",
    label: "Stillness",
    desc: "Slow down. Breathe. Be here.",
    icon: "🌿",
  },
  {
    id: "clarity",
    label: "Clarity",
    desc: "When your head is full and you need to see clearly.",
    icon: "🔦",
  },
  {
    id: "life",
    label: "Life",
    desc: "The practical stuff. It matters too.",
    icon: "📋",
  },
  {
    id: "together",
    label: "Together",
    desc: "Tools that reach outward.",
    icon: "🤝",
  },
];

// ─── UI helpers ───────────────────────────────────────────────────────────────
function Pill({ children, className = "" }) {
  return (
    <span className={
      "rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-0.5 text-[11px] text-[var(--muted)] " + className
    }>
      {children}
    </span>
  );
}

function SmallBtn({ children, onClick, className = "" }) {
  return (
    <button type="button" onClick={onClick}
      className={"rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--bg-elev)] transition " + className}>
      {children}
    </button>
  );
}

// ─── Featured card ────────────────────────────────────────────────────────────
function FeaturedCard({ tool, onOpen, onPin, isPinned, canAccess }) {
  if (!tool) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--accent)] bg-[var(--bg-elev)] p-6 shadow-lg">
      <div className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: "radial-gradient(600px at 0% 0%, color-mix(in oklab, var(--accent) 8%, transparent), transparent)" }}/>

      <div className="relative">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                Featured
              </span>
              {tool.isNew && (
                <span className="rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] px-2 py-0.5 text-[10px] font-semibold">
                  New
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-[var(--text)]">{tool.title}</h2>
          </div>
          {tool.requiresAuth && <Pill className="shrink-0 opacity-70">🔒 login</Pill>}
        </div>

        <p className="text-sm text-[var(--muted)] leading-6 mb-4">{tool.desc}</p>

        <div className="flex flex-wrap gap-2 mb-5">
          {tool.tags.map(t => <Pill key={t}>{t}</Pill>)}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onOpen(tool)}
            className="rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] px-5 py-2 text-sm font-semibold hover:opacity-90 transition shadow">
            {canAccess(tool) ? "Open →" : "Log in to open →"}
          </button>
          <SmallBtn onClick={() => onPin(tool)}>
            {isPinned ? "Unpin" : "Pin"}
          </SmallBtn>
        </div>
      </div>
    </div>
  );
}

// ─── Tool card ────────────────────────────────────────────────────────────────
function ToolCard({ tool, onOpen, onPin, onHide, isPinned, canAccess }) {
  return (
    <div className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 hover:border-[var(--accent)] hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[var(--text)]">{tool.title}</p>
            {tool.isNew && (
              <span className="rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] px-2 py-0.5 text-[10px] font-semibold">New</span>
            )}
            {tool.requiresAuth && <Pill className="opacity-70">🔒</Pill>}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)] leading-5">{tool.desc}</p>
        </div>
        <button type="button" onClick={() => onPin(tool)}
          className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition">
          {isPinned ? "Pinned ★" : "Pin"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {tool.tags.map(t => <Pill key={t}>{t}</Pill>)}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => onOpen(tool)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--bg-elev)] hover:shadow-sm transition">
          {canAccess(tool) ? "Open →" : "Log in →"}
        </button>
        <button type="button" onClick={() => onHide(tool)}
          className="rounded-lg px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] transition">
          Hide
        </button>
      </div>
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────
function CategorySection({ category, tools, onOpen, onPin, onHide, pinnedIds, canAccess }) {
  if (!tools.length) return null;
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-lg">{category.icon}</span>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">{category.label}</h3>
          <p className="text-xs text-[var(--muted)]">{category.desc}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tools.map(t => (
          <ToolCard key={t.id} tool={t}
            onOpen={onOpen} onPin={onPin} onHide={onHide}
            isPinned={pinnedIds.includes(t.id)} canAccess={canAccess}/>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { isLoggedIn, displayName } = useAuth?.() || { isLoggedIn: false, displayName: null };

  const initial = useMemo(() => {
    const stored = loadState();
    return stored || {
      lastToolId: null,
      pinnedToolIds: [],
      hiddenToolIds: [],
      createdAtISO: new Date().toISOString().slice(0, 10),
      version: 3,
    };
  }, []);

  const [lastToolId, setLastToolId]         = useState(initial.lastToolId);
  const [pinnedToolIds, setPinnedToolIds]   = useState(initial.pinnedToolIds || []);
  const [hiddenToolIds, setHiddenToolIds]   = useState(initial.hiddenToolIds || []);

  useEffect(() => {
    saveState({ lastToolId, pinnedToolIds, hiddenToolIds, createdAtISO: initial.createdAtISO, version: 3 });
  }, [lastToolId, pinnedToolIds, hiddenToolIds]);

  const visibleTools = useMemo(() =>
    TOOLS.filter(t => t.isPublic && !hiddenToolIds.includes(t.id)),
    [hiddenToolIds]
  );

  const featured = useMemo(() => {
    const f = visibleTools.find(t => t.isFeatured);
    if (f) return f;
    return [...visibleTools].sort((a, b) => b.updatedAtISO.localeCompare(a.updatedAtISO))[0] || null;
  }, [visibleTools]);

  const lastTool = useMemo(() =>
    lastToolId ? TOOLS.find(t => t.id === lastToolId) || null : null,
    [lastToolId]
  );

  const pinnedTools = useMemo(() =>
    pinnedToolIds.map(id => TOOLS.find(t => t.id === id)).filter(Boolean),
    [pinnedToolIds]
  );

  const canAccess = (t) => !(t?.requiresAuth && !isLoggedIn);

  const openTool = (t) => {
    if (!t) return;
    if (!canAccess(t)) { navigate(`/login?next=${encodeURIComponent(t.to)}`); return; }
    setLastToolId(t.id);
    navigate(t.to);
  };

  const pinTool = (t) => setPinnedToolIds(prev =>
    prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
  );

  const hideTool = (t) => setHiddenToolIds(prev => prev.includes(t.id) ? prev : [t.id, ...prev]);
  const restoreAll = () => setHiddenToolIds([]);

  const toolsByCategory = useMemo(() => {
    const map = {};
    CATEGORIES.forEach(c => { map[c.id] = []; });
    visibleTools.forEach(t => {
      if (map[t.category]) map[t.category].push(t);
    });
    return map;
  }, [visibleTools]);

  const showContinue = isLoggedIn && lastTool && canAccess(lastTool) && lastTool.id !== featured?.id;

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-4xl px-5 py-12 space-y-10">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <header>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-2">
                  PneumEvolve
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-snug">
                  I built this for myself.
                  <br />
                  <span className="text-[var(--muted)] font-normal">You're welcome here too.</span>
                </h1>
              </div>
              <p className="text-sm text-[var(--muted)] leading-6">
                A collection of tools for thinking, breathing, and becoming. Started as something spiritual. Turned into something practical. Still both.
              </p>
              <Link to="/about" className="text-xs text-[var(--muted)] hover:text-[var(--text)] underline underline-offset-2 transition mt-2 inline-block">
                What is this? →
              </Link>
              {isLoggedIn && (
                <p className="text-xs text-[var(--muted)]">
                  Welcome back{displayName ? `, ${displayName}` : ""}.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:items-end shrink-0">
              {isLoggedIn ? (
                <Link to="/account"
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium hover:shadow transition text-center">
                  Account
                </Link>
              ) : (
                <>
                  <Link to="/login"
                    className="rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] px-4 py-2 text-xs font-semibold hover:opacity-90 transition shadow text-center">
                    Log in
                  </Link>
                  <Link to="/signup"
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium hover:shadow transition text-center">
                    Create account
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── Quick strip: Continue + Pinned ────────────────────────────── */}
        {(showContinue || pinnedTools.length > 0) && (
          <div className="space-y-3">
            {showContinue && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">Continue</p>
                <p className="text-sm font-semibold text-[var(--text)]">{lastTool.title}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5 mb-3">{lastTool.desc}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openTool(lastTool)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-medium hover:shadow transition">
                    Continue →
                  </button>
                  <SmallBtn onClick={() => setLastToolId(null)}>Clear</SmallBtn>
                </div>
              </div>
            )}
            {pinnedTools.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">Pinned</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pinnedTools.map(pinned => (
                    <div key={pinned.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4">
                      <p className="text-sm font-semibold text-[var(--text)]">{pinned.title}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5 mb-3">{pinned.desc}</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openTool(pinned)}
                          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-medium hover:shadow transition">
                          {canAccess(pinned) ? "Open →" : "Log in →"}
                        </button>
                        <SmallBtn onClick={() => pinTool(pinned)}>Unpin</SmallBtn>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Featured ──────────────────────────────────────────────────── */}
        {featured && (
          <FeaturedCard
            tool={featured}
            onOpen={openTool}
            onPin={pinTool}
            isPinned={pinnedToolIds.includes(featured.id)}
            canAccess={canAccess}
          />
        )}

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-[var(--border)]"/>
          <span className="text-xs text-[var(--muted)] font-medium">All tools</span>
          <div className="flex-1 h-px bg-[var(--border)]"/>
        </div>

        {/* ── Categorized tools ─────────────────────────────────────────── */}
        <div className="space-y-10">
          {CATEGORIES.map(cat => (
            <CategorySection
              key={cat.id}
              category={cat}
              tools={toolsByCategory[cat.id] || []}
              onOpen={openTool}
              onPin={pinTool}
              onHide={hideTool}
              pinnedIds={pinnedToolIds}
              canAccess={canAccess}
            />
          ))}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted)]">
            PneumEvolve — breathe and evolve.
          </p>
          <div className="flex items-center gap-4">
            {hiddenToolIds.length > 0 && (
              <button type="button" onClick={restoreAll}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)] underline transition">
                Restore hidden tools
              </button>
            )}
            <Link to="/sitemap" className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition">
              Sitemap
            </Link>
          </div>
        </footer>

      </div>
    </main>
  );
}