// src/pages/Meditation.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";

// --- timing utilities (UTC) ---
const FIVE_MIN = 5 * 60 * 1000;

function atUTC(date, h, m = 0, s = 0, ms = 0) {
  const d = new Date(date);
  d.setUTCHours(h, m, s, ms);
  return d;
}

// Return the most recent meditation start (00:00 or 12:00 UTC) before or equal to now
function getLastStartUTC(nowUTC) {
  const noon = atUTC(nowUTC, 12, 0, 0, 0);
  const midnight = atUTC(nowUTC, 0, 0, 0, 0);
  return nowUTC >= noon ? noon : midnight;
}

// Return the next meditation start (12:00 UTC if before noon, otherwise next day 00:00 UTC)
function getNextStartUTC(nowUTC) {
  const noon = atUTC(nowUTC, 12, 0, 0, 0);
  if (nowUTC < noon) return noon;
  const tomorrowMidnight = atUTC(nowUTC, 0, 0, 0, 0);
  tomorrowMidnight.setUTCDate(tomorrowMidnight.getUTCDate() + 1);
  return tomorrowMidnight;
}

const Meditation = () => {
  const [inSession, setInSession] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const compute = useCallback(() => {
    const nowLocal = new Date();
    const nowUTC = new Date(nowLocal.toISOString()); // normalized to UTC wall time

    const lastStart = getLastStartUTC(nowUTC);
    const sinceLastStart = nowUTC - lastStart;

    // If we’re within the 5-minute global window, show remaining session time
    if (sinceLastStart >= 0 && sinceLastStart < FIVE_MIN) {
      setInSession(true);
      setSecondsLeft(Math.ceil((FIVE_MIN - sinceLastStart) / 1000));
      return;
    }

    // Otherwise, countdown to the next window
    const nextStart = getNextStartUTC(nowUTC);
    const untilNext = nextStart - nowUTC;
    setInSession(false);
    setSecondsLeft(Math.max(0, Math.ceil(untilNext / 1000)));
  }, []);

  useEffect(() => {
    compute(); // initial
    const t = setInterval(compute, 1000);
    return () => clearInterval(t);
  }, [compute]);

  const mmss = (total) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <main className="main p-6 space-y-6">
      {/* Header bar, consistent with your theme */}
      <div className="section-bar flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">🧘 Global Meditation Timer</h1>
        <Link to="/sitemap" className="btn btn-secondary text-sm">
          ← Back to SiteMap
        </Link>
      </div>

      {/* Intro */}
      <section className="card space-y-3">
        <p className="text-base sm:text-lg">
          Every 12 hours (00:00 and 12:00 UTC), the world pauses for a shared 5-minute sit.
        </p>
        <p className="text-sm opacity-70">
          Join from anywhere. If you arrive during an active window, the timer shows the remaining time.
        </p>
      </section>

      {/* Timer */}
      <section className="card text-center space-y-3">
        <div className="text-sm opacity-70">
          {inSession ? "Session in progress" : "Next global session in"}
        </div>
        <div
          className="font-mono text-5xl sm:text-6xl tracking-widest select-none"
          aria-live="polite"
        >
          {mmss(Math.max(0, secondsLeft))}
        </div>

        {inSession ? (
          <div className="text-sm opacity-80">Breathe. You’re sitting with others right now.</div>
        ) : (
          <div className="text-sm opacity-70">Sessions start at 00:00 and 12:00 UTC.</div>
        )}
      </section>

      {/* Footer note */}
      <section className="text-center text-xs opacity-70">
        Times are synchronized in UTC. Someone is breathing with you.
      </section>
    </main>
  );
};

export default Meditation;