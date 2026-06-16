// src/Pages/ClearAndCalm.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { api } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dayKey(ts) {
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}
function soberDays(startIso) {
  if (!startIso) return 0;
  return Math.floor((Date.now() - new Date(startIso).getTime()) / 86400000);
}
function mmss(secs) {
  const s = Math.max(0, secs);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ─── Breathing configs by intensity ───────────────────────────────────────────
function getBreathConfig(intensity) {
  if (intensity <= 3) return {
    label: "Quick Reset",
    desc: "A gentle breath to ease the edge.",
    cycles: 4, inhale: 4, hold: 0, exhale: 6, holdOut: 0,
  };
  if (intensity <= 6) return {
    label: "Box Breathing",
    desc: "Equal sides. Equal time. Steady yourself.",
    cycles: 8, inhale: 4, hold: 4, exhale: 4, holdOut: 4,
  };
  return {
    label: "Full Reset",
    desc: "You're at a 7 or higher. Let's really bring you back.",
    cycles: 12, inhale: 4, hold: 7, exhale: 8, holdOut: 0,
  };
}

// ─── Meditation presets ────────────────────────────────────────────────────────
const MED_PRESETS = [
  { label: "2 min",  secs: 120 },
  { label: "5 min",  secs: 300 },
  { label: "10 min", secs: 600 },
  { label: "20 min", secs: 1200 },
];

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", className = "", disabled = false }) {
  const base = "rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-40";
  const v = {
    primary: "bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 shadow",
    ghost:   "border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-elev)]",
    success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow",
    danger:  "bg-red-500 text-white hover:bg-red-600 shadow",
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`${base} ${v[variant]} ${className}`}>
      {children}
    </button>
  );
}

function IntensityScale({ label, onSelect, includeZero = false }) {
  const numbers = includeZero ? [0,1,2,3,4,5,6,7,8,9,10] : [1,2,3,4,5,6,7,8,9,10];
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-center">{label}</div>
      <div className={`grid gap-2 ${includeZero ? "grid-cols-4" : "grid-cols-5"}`}>
        {numbers.map(n => (
          <button key={n} type="button" onClick={() => onSelect(n)}
            className={`rounded-xl py-3 text-sm font-bold border transition-all hover:scale-105 active:scale-95
              ${n === 0 ? "border-emerald-600 text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400"
                : n <= 3 ? "border-emerald-400 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                : n <= 6 ? "border-yellow-400 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                : "border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"}`}>
            {n === 0 ? "0 ✓" : n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-[var(--muted)] px-1">
        <span>{includeZero ? "Gone completely" : "Barely there"}</span><span>All-consuming</span>
      </div>
    </div>
  );
}

// ─── Breathing Exercise ────────────────────────────────────────────────────────
function BreathingExercise({ config, onComplete, onSkip }) {
  const phases = buildPhases(config);
  const [phaseIdx, setPhaseIdx]       = useState(0);
  const [cyclesDone, setCyclesDone]   = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(phases[0].secs);
  const [done, setDone]               = useState(false);
  const ref = useRef(null);

  function buildPhases(cfg) {
    const p = [];
    if (cfg.inhale)  p.push({ label: "Inhale", secs: cfg.inhale });
    if (cfg.hold)    p.push({ label: "Hold",   secs: cfg.hold });
    if (cfg.exhale)  p.push({ label: "Exhale", secs: cfg.exhale });
    if (cfg.holdOut) p.push({ label: "Hold",   secs: cfg.holdOut });
    return p;
  }

  useEffect(() => {
    if (done) return;
    ref.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev > 1) return prev - 1;
        setPhaseIdx(pi => {
          const next = pi + 1;
          if (next >= phases.length) {
            setCyclesDone(cd => {
              const newCd = cd + 1;
              if (newCd >= config.cycles) {
                clearInterval(ref.current);
                setDone(true);
              }
              return newCd;
            });
            setTimeout(() => setSecondsLeft(phases[0].secs), 0);
            return 0;
          }
          setTimeout(() => setSecondsLeft(phases[next].secs), 0);
          return next;
        });
        return prev;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [done]);

  const circumference  = 2 * Math.PI * 54;
  const progress       = cyclesDone / config.cycles;
  const currentPhase   = phases[phaseIdx] || phases[0];
  const scale = currentPhase.label === "Inhale" ? 1.15
    : currentPhase.label === "Exhale" ? 0.85 : 1;

  if (done) return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <div className="text-5xl">✨</div>
      <div>
        <div className="text-lg font-semibold">Well done.</div>
        <div className="text-xs text-[var(--muted)] mt-1">Now — how does the craving feel?</div>
      </div>
      <Btn variant="success" onClick={onComplete}>Rate it again →</Btn>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="text-center">
        <div className="text-sm font-semibold">{config.label}</div>
        <div className="text-xs text-[var(--muted)] mt-0.5">{config.desc}</div>
      </div>
      <div className="relative flex items-center justify-center w-40 h-40">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="6"/>
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent)" strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}/>
        </svg>
        <div className="w-24 h-24 rounded-full bg-[var(--accent)] opacity-20"
          style={{ transform: `scale(${scale})`, transition: `transform ${currentPhase.secs * 0.9}s ease-in-out` }}/>
        <div className="absolute flex flex-col items-center">
          <div className="text-2xl font-bold">{secondsLeft}</div>
          <div className="text-xs text-[var(--muted)]">{currentPhase.label}</div>
        </div>
      </div>
      <div className="text-xs text-[var(--muted)]">
        Cycle {Math.min(cyclesDone + 1, config.cycles)} of {config.cycles}
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="text-xs text-[var(--muted)] hover:text-[var(--text)] underline transition-colors"
      >
        skip breathing
      </button>
    </div>
  );
}

// ─── Craving Section ───────────────────────────────────────────────────────────
function CravingSection({ cravings, setCravings }) {
  const [step, setStep]               = useState("idle");
  const [intensityBefore, setIBefore] = useState(null);
  const [skipped, setSkipped]         = useState(false);
  const [saving, setSaving]           = useState(false);

  function handleBefore(val) { setIBefore(val); setSkipped(false); setStep("breathing"); }
  function handleBreathDone() { setStep("check"); }
  function handleSkip() { setSkipped(true); setStep("check"); }

  async function handleAfter(val) {
    setSaving(true);
    try {
      const { data } = await api.post("/clear-and-calm/cravings", {
        intensity_before:  intensityBefore,
        intensity_after:   val,
        skipped_breathing: skipped,
        recorded_at:       new Date().toISOString(),
      });
      const entry = {
        ts:               new Date(data.recorded_at).getTime(),
        intensityBefore:  data.intensity_before,
        intensityAfter:   data.intensity_after,
        reduction:        data.reduction,
        skippedBreathing: data.skipped_breathing,
      };
      setCravings(prev => [entry, ...prev]);
      setStep("done");
    } catch {
      // silently stay on "check" so they can retry
    } finally {
      setSaving(false);
    }
  }

  function reset() { setStep("idle"); setIBefore(null); setSkipped(false); }

  const config    = intensityBefore ? getBreathConfig(intensityBefore) : null;
  const lastEntry = cravings[0];

  function reductionMsg(r) {
    if (r >= 5) return "Huge shift. The breathing is working.";
    if (r >= 3) return "Solid reduction. Keep building this habit.";
    if (r >= 1) return "A little easier. Every bit counts.";
    if (r === 0) return "No change — we'll note this and try a different approach next time.";
    return "It got harder. That's real data. We'll adjust.";
  }

  function intensityColor(n) {
    return n >= 7 ? "text-red-500" : n >= 4 ? "text-yellow-500" : "text-emerald-500";
  }

  return (
    <Card>
      <h2 className="text-base font-semibold mb-1">Clear</h2>
      <p className="text-xs text-[var(--muted)] mb-4">Track and ride out your cravings.</p>

      {step === "idle" && (
        <button type="button" onClick={() => setStep("scale")}
          className="w-full rounded-2xl bg-[var(--accent)] text-[var(--accent-contrast)] py-6 text-xl font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all">
          I'm Craving Now
        </button>
      )}

      {step === "scale" && (
        <div className="space-y-4">
          <IntensityScale label="How intense is the craving right now?" onSelect={handleBefore}/>
          <Btn variant="ghost" onClick={reset} className="w-full">Cancel</Btn>
        </div>
      )}

      {step === "breathing" && config && (
        <div>
          <div className="text-xs text-[var(--muted)] text-center mb-2">
            Before: <span className="font-semibold text-[var(--text)]">{intensityBefore}/10</span>
          </div>
          <BreathingExercise config={config} onComplete={handleBreathDone} onSkip={handleSkip}/>
        </div>
      )}

      {step === "check" && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-xs text-[var(--muted)]">
              Before: <span className="font-semibold text-[var(--text)]">{intensityBefore}/10</span>
            </div>
            {skipped && (
              <div className="inline-block mt-1 rounded-full bg-[var(--bg)] border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
                breathing skipped
              </div>
            )}
          </div>
          <IntensityScale label="Rate the craving again — honestly." onSelect={handleAfter} includeZero/>
          {saving && <div className="text-xs text-center text-[var(--muted)]">Saving…</div>}
        </div>
      )}

      {step === "done" && lastEntry && (
        <div className="text-center space-y-4 py-2">
          <div className="text-4xl">{lastEntry.reduction >= 0 ? "💪" : "🌱"}</div>
          <div className="flex items-center justify-center gap-3">
            <div className="text-center">
              <div className={`text-2xl font-bold ${intensityColor(lastEntry.intensityBefore)}`}>
                {lastEntry.intensityBefore}
              </div>
              <div className="text-xs text-[var(--muted)]">before</div>
            </div>
            <div className="text-[var(--muted)] text-lg">→</div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${intensityColor(lastEntry.intensityAfter)}`}>
                {lastEntry.intensityAfter}
              </div>
              <div className="text-xs text-[var(--muted)]">after</div>
            </div>
            <div className="text-[var(--muted)] text-lg">=</div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${lastEntry.reduction > 0 ? "text-emerald-500" : lastEntry.reduction < 0 ? "text-red-500" : "text-[var(--muted)]"}`}>
                {lastEntry.reduction > 0 ? `−${lastEntry.reduction}` : lastEntry.reduction < 0 ? `+${Math.abs(lastEntry.reduction)}` : "0"}
              </div>
              <div className="text-xs text-[var(--muted)]">shift</div>
            </div>
          </div>
          {lastEntry.skippedBreathing && (
            <div className="inline-block rounded-full bg-[var(--bg)] border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
              breathing skipped
            </div>
          )}
          <div className="text-xs text-[var(--muted)] px-2">{reductionMsg(lastEntry.reduction)}</div>
          <Btn onClick={reset} className="w-full">Back</Btn>
        </div>
      )}
    </Card>
  );
}

// ─── Meditation Section ────────────────────────────────────────────────────────
function MeditationSection({ meditations, setMeditations }) {
  const [selected, setSelected]         = useState(null);
  const [running, setRunning]           = useState(false);
  const [secondsLeft, setSecondsLeft]   = useState(0);
  const [done, setDone]                 = useState(false);
  const [showManual, setShowManual]     = useState(false);
  const [manualMins, setManualMins]     = useState("");
  const [manualDate, setManualDate]     = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [manualSaving, setManualSaving] = useState(false);
  const [manualDone, setManualDone]     = useState(false);

  const intervalRef  = useRef(null);
  const selectedRef  = useRef(null);
  const startedAtRef = useRef(null);
  const wakeLockRef  = useRef(null);

  async function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch { /* silently fail */ }
  }

  function releaseWakeLock() {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && running) requestWakeLock();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [running]);

  async function logSession(elapsedSecs, recordedAt) {
    const secs = Math.max(1, Math.round(elapsedSecs));
    try {
      const payload = { duration_secs: secs };
      if (recordedAt) payload.recorded_at = recordedAt;
      const { data } = await api.post("/clear-and-calm/meditations", payload);
      const entry = {
        ts:   new Date(data.recorded_at).getTime(),
        secs: data.duration_secs,
      };
      setMeditations(prev => [entry, ...prev]);
      return true;
    } catch {
      return false;
    }
  }

  function start(preset) {
    setSelected(preset);
    selectedRef.current  = preset;
    startedAtRef.current = Date.now();
    setSecondsLeft(preset.secs);
    setRunning(true);
    setDone(false);
    setShowManual(false);
    requestWakeLock();
  }

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          releaseWakeLock();
          setTimeout(() => {
            setRunning(false);
            setDone(true);
            logSession(selectedRef.current?.secs ?? 0);
            startedAtRef.current = null;
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  function stop() {
    clearInterval(intervalRef.current);
    releaseWakeLock();
    if (startedAtRef.current) {
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      if (elapsed >= 10) logSession(elapsed);
    }
    setRunning(false);
    setSelected(null);
    setDone(false);
    startedAtRef.current = null;
  }

  async function submitManual() {
    const mins = parseFloat(manualMins);
    if (!mins || mins <= 0) return;
    const secs = Math.round(mins * 60);
    const recordedAt = manualDate ? new Date(manualDate).toISOString() : undefined;
    setManualSaving(true);
    const ok = await logSession(secs, recordedAt);
    setManualSaving(false);
    if (ok) {
      setManualDone(true);
      setManualMins("");
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setManualDate(now.toISOString().slice(0, 16));
      setTimeout(() => { setManualDone(false); setShowManual(false); }, 2000);
    }
  }

  const circumference = 2 * Math.PI * 54;
  const progress = selected ? (selected.secs - secondsLeft) / selected.secs : 0;

  return (
    <Card>
      <h2 className="text-base font-semibold mb-1">Calm</h2>
      <p className="text-xs text-[var(--muted)] mb-4">Build your daily stillness practice.</p>

      {!running && !done && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {MED_PRESETS.map(p => (
              <button key={p.label} type="button" onClick={() => start(p)}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] py-4 text-sm font-semibold hover:bg-[var(--bg-elev)] hover:scale-105 active:scale-95 transition-all">
                {p.label}
              </button>
            ))}
          </div>

          {/* Manual log */}
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            {!showManual ? (
              <button
                type="button"
                onClick={() => setShowManual(true)}
                className="w-full text-left text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors py-1"
              >
                + Log a session I already did
              </button>
            ) : manualDone ? (
              <div className="text-xs text-emerald-500 text-center py-1">✓ Logged</div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-medium text-[var(--muted)]">Log a past session</div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="minutes"
                    value={manualMins}
                    onChange={e => setManualMins(e.target.value)}
                    className="w-28 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm"
                  />
                  <span className="text-xs text-[var(--muted)]">min</span>
                </div>
                <input
                  type="datetime-local"
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm"
                />
                <div className="flex gap-2">
                  <Btn
                    onClick={submitManual}
                    disabled={manualSaving || !manualMins || parseFloat(manualMins) <= 0}
                    className="flex-1"
                  >
                    {manualSaving ? "Saving…" : "Log it"}
                  </Btn>
                  <Btn variant="ghost" onClick={() => setShowManual(false)} className="flex-1">
                    Cancel
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {running && (
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center w-40 h-40">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="6"/>
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent)" strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}/>
            </svg>
            <div className="absolute text-center">
              <div className="text-2xl font-bold">{mmss(secondsLeft)}</div>
              <div className="text-xs text-[var(--muted)]">remaining</div>
            </div>
          </div>
          <div className="text-xs text-[var(--muted)] text-center">Be here. That's all.</div>
          <Btn variant="ghost" onClick={stop}>End early</Btn>
        </div>
      )}

      {done && (
        <div className="text-center space-y-4 py-4">
          <div className="text-4xl">🌿</div>
          <div className="text-sm font-semibold">Session complete.</div>
          <div className="text-xs text-[var(--muted)]">
            {selected?.secs / 60} minutes of stillness. It adds up.
          </div>
          <Btn onClick={stop} className="w-full">Back</Btn>
        </div>
      )}
    </Card>
  );
}

// ─── Stats Section ─────────────────────────────────────────────────────────────
function StatsSection({ cravings, meditations, soberStart, smoked }) {
  const [win, setWin]                       = useState("week");
  const [showCravings, setShowCravings]     = useState(true);
  const [showMeditation, setShowMeditation] = useState(true);
  const [showGaveIn, setShowGaveIn]         = useState(true);

  const now   = Date.now();
  const winMs = win === "day" ? 86400000 : win === "week" ? 604800000 : 2592000000;

  const filtered       = cravings.filter(c => now - c.ts < winMs);
  const filteredMeds   = meditations.filter(m => now - m.ts < winMs);
  const filteredSmoked = smoked.filter(s => now - s.ts < winMs);

  const dayMap = {};
  filtered.forEach(c => {
    const k = dayKey(c.ts);
    if (!dayMap[k]) dayMap[k] = { date: k, cravings: 0, meditation: 0, gaveIn: 0 };
    dayMap[k].cravings++;
  });
  filteredMeds.forEach(m => {
    const k = dayKey(m.ts);
    if (!dayMap[k]) dayMap[k] = { date: k, cravings: 0, meditation: 0, gaveIn: 0 };
    dayMap[k].meditation++;
  });
  filteredSmoked.forEach(s => {
    const k = dayKey(s.ts);
    if (!dayMap[k]) dayMap[k] = { date: k, cravings: 0, meditation: 0, gaveIn: 0 };
    dayMap[k].gaveIn++;
  });
  const chartData = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

  const totalMedMins  = filteredMeds.reduce((acc, m) => acc + m.secs / 60, 0);
  const days          = soberDays(soberStart);
  const withReduction = filtered.filter(c => c.reduction !== undefined);
  const avgReduction  = withReduction.length
    ? (withReduction.reduce((a, c) => a + c.reduction, 0) / withReduction.length).toFixed(1)
    : null;

  function intensityColor(n) {
    return n >= 7 ? "text-red-500" : n >= 4 ? "text-yellow-500" : "text-emerald-500";
  }

  const allEvents = [
    ...cravings.map(c => ({ ...c, type: "craving" })),
    ...smoked.map(s => ({ ...s, type: "smoked" })),
    ...meditations.map(m => ({ ...m, type: "meditation" })),
  ].sort((a, b) => b.ts - a.ts);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">Your Journey</h2>
        <div className="flex gap-1">
          {["day","week","month"].map(w => (
            <button key={w} type="button" onClick={() => setWin(w)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all
                ${win === w
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                  : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"}`}>
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label: "Days Clear",    value: days,                                     sub: "sober streak" },
          { label: "Cravings",      value: filtered.length,                          sub: `this ${win}` },
          { label: "Avg Reduction", value: avgReduction ? `−${avgReduction}` : "—", sub: "intensity shift" },
          { label: "Meditation",    value: `${Math.round(totalMedMins)}m`,           sub: `this ${win}` },
          { label: "Gave In",       value: filteredSmoked.length,                    sub: `this ${win}` },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-center">
            <div className="text-2xl font-bold text-[var(--accent)]">{s.value}</div>
            <div className="text-xs font-medium mt-0.5">{s.label}</div>
            <div className="text-xs text-[var(--muted)]">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-3 flex-wrap">
        {[
          { key: "cravings",   label: "Cravings",  active: showCravings,   set: setShowCravings },
          { key: "meditation", label: "Meditation", active: showMeditation, set: setShowMeditation },
          { key: "gaveIn",     label: "Gave In",    active: showGaveIn,     set: setShowGaveIn },
        ].map(({ key, label, active, set }) => (
          <button key={key} type="button" onClick={() => set(v => !v)}
            className={"rounded-lg px-3 py-1 text-xs font-medium transition-all " +
              (active
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]")}>
            {label}
          </button>
        ))}
      </div>

      {chartData.length > 0 ? (
        <div className="mb-4">
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} allowDecimals={false} />
              <Tooltip contentStyle={{
                background: "var(--bg-elev)", border: "1px solid var(--border)",
                borderRadius: 8, fontSize: 12,
              }}/>
              {showCravings && (
                <Line type="monotone" dataKey="cravings" stroke="#f59e0b"
                  strokeWidth={2} dot={{ fill: "#f59e0b", r: 3 }} name="Cravings"/>
              )}
              {showMeditation && (
                <Line type="monotone" dataKey="meditation" stroke="#10b981"
                  strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} name="Meditation"/>
              )}
              {showGaveIn && (
                <Line type="monotone" dataKey="gaveIn" stroke="#fb7185"
                  strokeWidth={2} dot={{ fill: "#fb7185", r: 3 }} name="Gave In"/>
              )}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-1 flex-wrap">
            {showCravings   && <div className="flex items-center gap-1 text-xs text-[var(--muted)]"><div className="w-3 h-0.5 bg-amber-400 rounded"/>Cravings</div>}
            {showMeditation && <div className="flex items-center gap-1 text-xs text-[var(--muted)]"><div className="w-3 h-0.5 bg-emerald-500 rounded"/>Meditation</div>}
            {showGaveIn     && <div className="flex items-center gap-1 text-xs text-[var(--muted)]"><div className="w-3 h-0.5 bg-rose-400 rounded"/>Gave In</div>}
          </div>
        </div>
      ) : (
        <div className="text-center text-xs text-[var(--muted)] py-6 mb-4">
          Nothing logged this {win} yet. Keep going.
        </div>
      )}

      {allEvents.length > 0 && (
        <div>
          <div className="text-xs text-[var(--muted)] mb-2">Recent log</div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {allEvents.slice(0, 20).map((e, i) => (
              e.type === "craving" ? (
                <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs">
                  <span className="text-[var(--muted)]">
                    {new Date(e.ts).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                  <div className="flex items-center gap-3">
                    {e.skippedBreathing && (
                      <span className="text-[var(--muted)] opacity-50" title="breathing skipped">⏭</span>
                    )}
                    <span className="text-[var(--muted)]">
                      <span className={`font-semibold ${intensityColor(e.intensityBefore)}`}>{e.intensityBefore}</span>
                      {" → "}
                      <span className={`font-semibold ${intensityColor(e.intensityAfter)}`}>{e.intensityAfter}</span>
                    </span>
                    <span className={`font-semibold ${e.reduction > 0 ? "text-emerald-500" : e.reduction < 0 ? "text-red-500" : "text-[var(--muted)]"}`}>
                      {e.reduction > 0 ? `−${e.reduction}` : e.reduction < 0 ? `+${Math.abs(e.reduction)}` : "0"}
                    </span>
                    <span>{e.reduction >= 0 ? "💪" : "🌱"}</span>
                  </div>
                </div>
              ) : e.type === "smoked" ? (
                <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs opacity-70">
                  <span className="text-[var(--muted)]">
                    {new Date(e.ts).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400 font-medium">gave in</span>
                    <span>🌀</span>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs">
                  <span className="text-[var(--muted)]">
                    {new Date(e.ts).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-medium">
                      {e.secs >= 60 ? `${Math.round(e.secs / 60)}m` : `${e.secs}s`} meditation
                    </span>
                    <span>🌿</span>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Gave In Section ──────────────────────────────────────────────────────────
function SmokedSection({ smoked, setSmoked, soberStart, setSoberStart }) {
  const [step, setStep]               = useState("idle");
  const [showPicker, setShowPicker]   = useState(false);
  const [customDateTime, setCustomDateTime] = useState("");
  const [saving, setSaving]           = useState(false);
  const pendingTsRef = useRef(null);

  function handleGaveIn() {
    setStep("when");
    setShowPicker(false);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setCustomDateTime(now.toISOString().slice(0, 16));
  }

  function handleWhen(ts) {
    pendingTsRef.current = ts;
    const days = soberDays(soberStart);
    if (soberStart && days > 0) {
      setStep("streak");
    } else {
      commitLog(ts, false);
    }
  }

  async function commitLog(ts, resetStreak) {
    setSaving(true);
    try {
      await api.post("/clear-and-calm/gave-in", {
        occurred_at:  new Date(ts).toISOString(),
        reset_streak: resetStreak,
      });
      const entry = { ts, type: "smoked" };
      setSmoked(prev => [entry, ...prev]);
      if (resetStreak) setSoberStart(new Date(ts).toISOString());
      setStep("done");
    } catch {
      setStep("idle");
    } finally {
      setSaving(false);
    }
  }

  function handleStreakReset() { commitLog(pendingTsRef.current, true);  }
  function handleStreakKeep()  { commitLog(pendingTsRef.current, false); }

  function reset() {
    setStep("idle");
    setShowPicker(false);
    pendingTsRef.current = null;
  }

  const days = soberDays(soberStart);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] px-5 py-4">
      {step === "idle" && (
        <button type="button" onClick={handleGaveIn}
          className="w-full text-left text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors py-1">
          + I gave in
        </button>
      )}

      {step === "when" && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-[var(--muted)]">When did it happen?</div>
          <div className="flex gap-2">
            <Btn variant="primary" onClick={() => handleWhen(Date.now())} className="flex-1">Now</Btn>
            <Btn variant="ghost" onClick={() => setShowPicker(v => !v)} className="flex-1">Earlier…</Btn>
          </div>
          {showPicker && (
            <div className="flex gap-2 items-center pt-1">
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={e => setCustomDateTime(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm"
              />
              <Btn onClick={() => {
                const ts = new Date(customDateTime).getTime();
                if (!isNaN(ts)) handleWhen(ts);
              }}>Log</Btn>
            </div>
          )}
          <button type="button" onClick={reset}
            className="text-xs text-[var(--muted)] hover:text-[var(--text)] underline w-full text-center transition-colors">
            cancel
          </button>
        </div>
      )}

      {step === "streak" && (
        <div className="space-y-4 text-center py-1">
          <div className="text-sm font-medium">
            Your streak is at <span className="text-[var(--accent)] font-bold">{days} day{days !== 1 ? "s" : ""}</span>.
          </div>
          <p className="text-xs text-[var(--muted)]">Do you want to reset it?</p>
          <div className="flex gap-2 justify-center">
            <Btn variant="danger" onClick={handleStreakReset} disabled={saving}>Reset streak</Btn>
            <Btn variant="ghost" onClick={handleStreakKeep}  disabled={saving}>Keep it</Btn>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--muted)]">Recorded. You're still here.</span>
          <button type="button" onClick={reset}
            className="text-xs text-[var(--muted)] hover:text-[var(--text)] underline transition-colors">
            done
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sober Start Banner ────────────────────────────────────────────────────────
function SoberStartBanner({ soberStart, setSoberStart }) {
  const [editing, setEditing] = useState(false);
  const [dateVal, setDateVal] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving]   = useState(false);

  async function save(isoString) {
    setSaving(true);
    try {
      await api.put("/clear-and-calm/sober-start", { started_at: isoString });
      setSoberStart(isoString);
      setEditing(false);
    } catch { /* stay in edit mode */ }
    finally { setSaving(false); }
  }

  if (soberStart && !editing) {
    const days = soberDays(soberStart);
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] px-5 py-3 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-[var(--accent)]">
            {days} day{days !== 1 ? "s" : ""} clear
          </span>
          <span className="text-xs text-[var(--muted)] ml-2">
            since {new Date(soberStart).toLocaleDateString()}
          </span>
        </div>
        <button type="button" onClick={() => setEditing(true)}
          className="text-xs text-[var(--muted)] hover:text-[var(--text)] underline">
          edit
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] px-5 py-4 space-y-3">
      <div className="text-sm font-medium">When did you start your clear journey?</div>
      <div className="flex flex-wrap gap-2 items-center">
        <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm"/>
        <Btn disabled={saving} onClick={() => save(new Date(dateVal).toISOString())}>
          Set Date
        </Btn>
        <Btn variant="ghost" disabled={saving} onClick={() => save(new Date().toISOString())}>
          Starting Today
        </Btn>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ClearAndCalm() {
  const navigate = useNavigate();

  const [loading, setLoading]         = useState(true);
  const [cravings, setCravings]       = useState([]);
  const [meditations, setMeditations] = useState([]);
  const [soberStart, setSoberStart]   = useState(null);
  const [smoked, setSmoked]           = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/clear-and-calm/sync");

        setCravings(
          (data.cravings || []).map(c => ({
            ts:               new Date(c.recorded_at).getTime(),
            intensityBefore:  c.intensity_before,
            intensityAfter:   c.intensity_after,
            reduction:        c.reduction,
            skippedBreathing: c.skipped_breathing,
          }))
        );
        setMeditations(
          (data.meditations || []).map(m => ({
            ts:   new Date(m.recorded_at).getTime(),
            secs: m.duration_secs,
          }))
        );
        setSmoked(
          (data.gave_in || []).map(g => ({
            ts: new Date(g.occurred_at).getTime(),
          }))
        );
        setSoberStart(data.sober_start || null);
      } catch (err) {
        if (err?.response?.status === 401) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center">
        <div className="text-sm text-[var(--muted)]">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-5">

        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Clear & Calm</h1>
            <p className="text-sm text-[var(--muted)] mt-0.5">
              Quit what dulls you. Build what grounds you.
            </p>
          </div>
          <Link to="/"
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition">
            ← Home
          </Link>
        </header>

        <SoberStartBanner soberStart={soberStart} setSoberStart={setSoberStart}/>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CravingSection cravings={cravings} setCravings={setCravings}/>
          <MeditationSection meditations={meditations} setMeditations={setMeditations}/>
        </div>

        <StatsSection
          cravings={cravings}
          meditations={meditations}
          soberStart={soberStart}
          smoked={smoked}
        />

        <SmokedSection
          smoked={smoked}
          setSmoked={setSmoked}
          soberStart={soberStart}
          setSoberStart={setSoberStart}
        />

        <p className="text-center text-xs text-[var(--muted)] pb-4">
          Your journey, your data. Stored securely to your account.
        </p>

      </div>
    </main>
  );
}