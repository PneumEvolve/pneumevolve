import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";

const DEFAULT_DURATION_MIN = 5;
const LS_KEY = "pe_meditation_groups_v1";

// ---------- helpers ----------
function safeUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadLocalGroups() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalGroups(groups) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(groups));
  } catch {
    // ignore
  }
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatHHMM(hourUTC, minuteUTC) {
  return `${String(hourUTC).padStart(2, "0")}:${String(minuteUTC).padStart(2, "0")} UTC`;
}

function formatDuration(minutes) {
  return `${minutes} min`;
}

function mmss(total) {
  const safe = Math.max(0, total);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function hhmmss(total) {
  const safe = Math.max(0, total);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Daily UTC session logic for a single group time
function getLastStartForGroup(nowUTC, hourUTC, minuteUTC) {
  const d = new Date(nowUTC);
  d.setUTCHours(hourUTC, minuteUTC, 0, 0);

  if (d.getTime() > nowUTC.getTime()) {
    d.setUTCDate(d.getUTCDate() - 1);
  }

  return d;
}

function getNextStartForGroup(nowUTC, hourUTC, minuteUTC) {
  const d = new Date(nowUTC);
  d.setUTCHours(hourUTC, minuteUTC, 0, 0);

  if (d.getTime() <= nowUTC.getTime()) {
    d.setUTCDate(d.getUTCDate() + 1);
  }

  return d;
}

function getSessionState(group) {
  const nowUTC = new Date();
  const durationMs = group.durationMin * 60 * 1000;

  const lastStart = getLastStartForGroup(nowUTC, group.hourUTC, group.minuteUTC);
  const elapsed = nowUTC.getTime() - lastStart.getTime();

  if (elapsed >= 0 && elapsed < durationMs) {
    const secondsLeft = Math.ceil((durationMs - elapsed) / 1000);
    return {
      inSession: true,
      secondsLeft,
      nextStart: getNextStartForGroup(nowUTC, group.hourUTC, group.minuteUTC),
      lastStart,
    };
  }

  const nextStart = getNextStartForGroup(nowUTC, group.hourUTC, group.minuteUTC);
  const secondsLeft = Math.ceil((nextStart.getTime() - nowUTC.getTime()) / 1000);

  return {
    inSession: false,
    secondsLeft,
    nextStart,
    lastStart,
  };
}

function localTimeToUTCParts(timeStr) {
  const [rawHour, rawMinute] = String(timeStr || "00:00").split(":");
  const hour = clamp(toNumber(rawHour, 0), 0, 23);
  const minute = clamp(toNumber(rawMinute, 0), 0, 59);

  const now = new Date();
  const localDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0
  );

  return {
    hourUTC: localDate.getUTCHours(),
    minuteUTC: localDate.getUTCMinutes(),
  };
}

function utcToLocalLabel(hourUTC, minuteUTC) {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUTC, minuteUTC, 0));
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

// share link encoding
function encodeGroup(group) {
  try {
    const payload = {
      n: group.name,
      h: group.hourUTC,
      m: group.minuteUTC,
      d: group.durationMin,
      msg: group.message || "",
      slug: group.slug || "",
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  } catch {
    return "";
  }
}

function decodeGroup(raw) {
  try {
    const json = decodeURIComponent(escape(atob(raw)));
    const parsed = JSON.parse(json);

    const name = String(parsed.n || "").trim();
    if (!name) return null;

    return {
      id: `shared-${parsed.slug || safeUUID()}`,
      slug: String(parsed.slug || "").trim() || safeUUID(),
      name,
      hourUTC: clamp(toNumber(parsed.h, 12), 0, 23),
      minuteUTC: clamp(toNumber(parsed.m, 0), 0, 59),
      durationMin: clamp(toNumber(parsed.d, DEFAULT_DURATION_MIN), 1, 60),
      message: String(parsed.msg || "").trim(),
      source: "shared",
    };
  } catch {
    return null;
  }
}

const BUILT_IN_GROUP = {
  id: "family-group",
  slug: "family",
  name: "Family Meditation Group",
  hourUTC: 2, // example: 02:00 UTC daily
  minuteUTC: 0,
  durationMin: 5,
  message: "Sit together for a few minutes and hold each other in mind.",
  source: "built-in",
};

function GroupCard({ group, active, onSelect }) {
  const [tick, setTick] = useState(() => getSessionState(group));

  useEffect(() => {
    const update = () => setTick(getSessionState(group));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [group]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition shadow-sm ${
        active
          ? "border-[var(--text)] bg-[var(--bg-elev)]"
          : "border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-elev)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text)]">{group.name}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {formatHHMM(group.hourUTC, group.minuteUTC)} · {formatDuration(group.durationMin)}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]">
          {tick.inSession ? "live now" : "daily"}
        </div>
      </div>

      {group.message ? (
        <p className="mt-3 text-sm text-[var(--muted)] line-clamp-2">{group.message}</p>
      ) : null}

      <p className="mt-3 text-xs text-[var(--muted)]">
        {tick.inSession ? "Session in progress" : `Next sit in ${hhmmss(tick.secondsLeft)}`}
      </p>
    </button>
  );
}

export default function Meditation() {
  const location = useLocation();

  const [localGroups, setLocalGroups] = useState(() => loadLocalGroups());
  const [activeGroupId, setActiveGroupId] = useState(BUILT_IN_GROUP.id);
  const [copied, setCopied] = useState("");

  const [name, setName] = useState("");
  const [localTime, setLocalTime] = useState("20:00");
  const [durationMin, setDurationMin] = useState(String(DEFAULT_DURATION_MIN));
  const [message, setMessage] = useState("");

  const sharedGroup = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("g");
    if (!raw) return null;
    return decodeGroup(raw);
  }, [location.search]);

  const allGroups = useMemo(() => {
    const normalizedLocal = localGroups.map((g) => ({
      ...g,
      source: "local",
    }));

    const base = [BUILT_IN_GROUP, ...normalizedLocal];

    if (sharedGroup) {
      const alreadyExists = base.some((g) => g.slug === sharedGroup.slug && g.name === sharedGroup.name);
      return alreadyExists ? base : [sharedGroup, ...base];
    }

    return base;
  }, [localGroups, sharedGroup]);

  const activeGroup =
    allGroups.find((g) => g.id === activeGroupId) ||
    (sharedGroup ? sharedGroup : BUILT_IN_GROUP);

  const [sessionState, setSessionState] = useState(() => getSessionState(activeGroup));

  useEffect(() => {
    if (sharedGroup) {
      setActiveGroupId(sharedGroup.id);
    }
  }, [sharedGroup]);

  useEffect(() => {
    saveLocalGroups(localGroups);
  }, [localGroups]);

  useEffect(() => {
    const update = () => setSessionState(getSessionState(activeGroup));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [activeGroup]);

  const handleCreateGroup = useCallback(
  (e) => {
    e.preventDefault();

    const cleanName = name.trim();
    if (!cleanName) return;

    const { hourUTC: nextHourUTC, minuteUTC: nextMinuteUTC } = localTimeToUTCParts(localTime);

    const next = {
      id: safeUUID(),
      slug:
        cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
        safeUUID(),
      name: cleanName,
      hourUTC: nextHourUTC,
      minuteUTC: nextMinuteUTC,
      durationMin: clamp(toNumber(durationMin, DEFAULT_DURATION_MIN), 1, 60),
      message: message.trim(),
    };

    setLocalGroups((prev) => [next, ...prev]);
    setActiveGroupId(next.id);

    setName("");
    setLocalTime("20:00");
    setDurationMin(String(DEFAULT_DURATION_MIN));
    setMessage("");
  },
  [name, localTime, durationMin, message]
);

  const handleDeleteGroup = useCallback(
    (groupId) => {
      setLocalGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (activeGroupId === groupId) {
        setActiveGroupId(BUILT_IN_GROUP.id);
      }
    },
    [activeGroupId]
  );

  const shareLink = useMemo(() => {
    const encoded = encodeGroup(activeGroup);
    if (!encoded || typeof window === "undefined") return "";
    return `${window.location.origin}${window.location.pathname}?g=${encodeURIComponent(encoded)}`;
  }, [activeGroup]);

  const copyShareLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied("Copied link");
      setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("Copy failed");
      setTimeout(() => setCopied(""), 1600);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-6xl px-5 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Think Together
            </h1>
            <p className="text-sm text-[var(--muted)] max-w-2xl">
              A simple shared sit. Pick a time, share a link, and pause together from wherever you are.
            </p>
          </div>

          <Link
            to="/sitemap"
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-sm font-medium shadow-sm hover:shadow transition"
          >
            ← Back
          </Link>
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  Active group
                </p>
                <h2 className="mt-1 text-2xl font-semibold">{activeGroup.name}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {formatHHMM(activeGroup.hourUTC, activeGroup.minuteUTC)} daily
                  {" · "}
                  {formatDuration(activeGroup.durationMin)}
                  {" · "}
                  your local time: {utcToLocalLabel(activeGroup.hourUTC, activeGroup.minuteUTC)}
                </p>
                {activeGroup.message ? (
                  <p className="mt-3 text-sm text-[var(--muted)]">{activeGroup.message}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 text-center">
                <div className="text-sm text-[var(--muted)]">
                  {sessionState.inSession ? "Session in progress" : "Next session in"}
                </div>

                <div
                  className="mt-3 font-mono text-5xl sm:text-6xl tracking-widest select-none"
                  aria-live="polite"
                >
                  {sessionState.inSession
                    ? mmss(sessionState.secondsLeft)
                    : hhmmss(sessionState.secondsLeft)}
                </div>

                <div className="mt-3 text-sm text-[var(--muted)]">
                  {sessionState.inSession
                    ? "Sit, breathe, and hold your people in mind."
                    : "When the timer reaches zero, everyone with this group link is synced."}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 space-y-3">
              <p className="text-sm font-medium">Share this group</p>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-3 text-xs break-all text-[var(--muted)]">
                {shareLink || "Select a group to generate a share link."}
              </div>

              <button
                type="button"
                onClick={copyShareLink}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-sm font-medium shadow-sm hover:shadow transition"
              >
                Copy invite link
              </button>

              {copied ? <p className="text-xs text-[var(--muted)]">{copied}</p> : null}

              <p className="text-xs text-[var(--muted)]">
                This MVP is frontend-only. The shared timing is real. Participant counts and real signups would be the next backend step.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Create a group</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Make a daily shared sit and send the link to family or anyone else who wants in.
              </p>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Group name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g Family Evening Sit"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
  <div>
    <label className="block text-xs text-[var(--muted)] mb-1">Your local time</label>
    <input
      type="time"
      value={localTime}
      onChange={(e) => setLocalTime(e.target.value)}
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
    />
  </div>

  <div>
    <label className="block text-xs text-[var(--muted)] mb-1">Duration</label>
    <input
      type="number"
      min="1"
      max="60"
      value={durationMin}
      onChange={(e) => setDurationMin(e.target.value)}
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
    />
  </div>
</div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Optional message</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Let’s pause and think of each other for five minutes."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-medium shadow-sm hover:shadow transition"
              >
                Create group
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Groups</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Start with the built-in group or make your own.
              </p>
            </div>

            <div className="grid gap-3">
              {allGroups.map((group) => (
                <div key={group.id} className="flex gap-2">
                  <div className="flex-1">
                    <GroupCard
                      group={group}
                      active={group.id === activeGroup.id}
                      onSelect={() => setActiveGroupId(group.id)}
                    />
                  </div>

                  {group.source === "local" ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group.id)}
                      className="self-start rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}