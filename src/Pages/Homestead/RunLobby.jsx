// src/Pages/Homestead/RunLobby.jsx
// 30-second window where partner can join before run starts solo.
// Supports: forest | mining | fruit | fishing

import React, { useEffect, useRef, useState } from "react";
import { useHearthroom } from "./useHearthroom";

// Prevent the browser from scrolling while the run-lobby menu is mounted.
function useBlockBrowserScroll(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const block = (e) => e.preventDefault();
    el.addEventListener("wheel", block, { passive: false });
    // Also block spacebar scroll on the document while this screen is open
    const blockSpace = (e) => {
      if (e.key === " " || e.code === "Space") e.preventDefault();
    };
    window.addEventListener("keydown", blockSpace);
    return () => {
      el.removeEventListener("wheel", block);
      window.removeEventListener("keydown", blockSpace);
    };
  }, [ref]);
}

const COUNTDOWN_S = 30;

const RUN_INFO = {
  forest:  { icon:"🌲", label:"Forest Run",       desc:"Fight wolves, chop trees, forage herbs.",        bg:"#0a120a", accent:"rgba(200,230,120,0.9)"  },
  mining:  { icon:"⛏️", label:"Mining Run",        desc:"Explore caves, mine ore, battle bats.",          bg:"#0a0804", accent:"rgba(220,180,80,0.9)"   },
  fruit:   { icon:"🍎", label:"Fruit Picking",     desc:"Peaceful orchard harvesting — no enemies!",     bg:"#0a1004", accent:"rgba(160,230,80,0.9)"    },
  fishing: { icon:"🎣", label:"Fishing Trip",      desc:"Cast your line, time your pull, reel in fish.", bg:"#04101a", accent:"rgba(80,200,255,0.9)"    },
};

export default function RunLobby({ room, role, onRunStart, onCancel, joining = false, joinSeed = null, runType: propRunType = null, equipment = null, canStartRun = true }) {
  const [countdown,     setCountdown]    = useState(COUNTDOWN_S);
  const [partnerJoined, setPartnerJoined] = useState(joining);
  const [seed]          = useState(() => joining && joinSeed ? joinSeed : (Date.now() & 0x7fffffff));
  const [selectedType,  setSelectedType] = useState(propRunType ?? "forest");
  const [confirmed,     setConfirmed]    = useState(joining || propRunType !== null);
  const timerRef   = useRef(null);
  const startedRef = useRef(false);
  const containerRef = useRef(null);
  useBlockBrowserScroll(containerRef);

  const info = RUN_INFO[selectedType] || RUN_INFO.forest;

  function startRun(coOp) {
    if (startedRef.current) return;
    startedRef.current = true;
    clearInterval(timerRef.current);
    onRunStart({ seed, coOp, runType: selectedType });
  }

  const seedRef = useRef(seed);
  const typeRef = useRef(selectedType);
  useEffect(() => { typeRef.current = selectedType; }, [selectedType]);

  const handlers = useRef({
    onRunJoined: () => {
      setPartnerJoined(true);
      if (!startedRef.current) {
        startedRef.current = true;
        clearInterval(timerRef.current);
        sendRunStartedRef.current?.(seedRef.current, typeRef.current);
        onRunStart({ seed: seedRef.current, coOp: true, runType: typeRef.current });
      }
    },
    onRunStarted: ({ seed: remoteSeed, runType: remoteType }) => {
      if (!startedRef.current) {
        startedRef.current = true;
        clearInterval(timerRef.current);
        onRunStart({ seed: remoteSeed, coOp: true, runType: remoteType ?? "forest" });
      }
    },
    onRunCancelled: () => {
      clearInterval(timerRef.current);
      onCancel?.();
    },
  }).current;

  const { sendRunQueued, sendRunJoined, sendRunStarted, sendRunCancelled } =
    useHearthroom(room?.id ?? null, handlers);

  const sendRunStartedRef = useRef(null);
  useEffect(() => { sendRunStartedRef.current = sendRunStarted; }, [sendRunStarted]);

  useEffect(() => {
    // Gated out (already ran today) — don't signal the host or start anything.
    // The lock screen below will render instead.
    if (!canStartRun) return;

    if (joining) {
      // Tell the queuer we've joined, then wait for their run_started broadcast.
      // Don't self-start here — onRunStarted will fire with the canonical seed
      // once the queuer confirms, ensuring both players use the identical seed.
      sendRunJoined("p2");
      // Safety fallback: if we haven't received run_started within 15 seconds,
      // start with our own seed so the joiner isn't stuck forever.
      const fallback = setTimeout(() => {
        if (!startedRef.current) startRun(true);
      }, 15000);
      return () => clearTimeout(fallback);
    }
    if (!confirmed) return; // Wait for type selection before countdown

    sendRunQueued(selectedType, seed);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          startRun(partnerJoined);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [confirmed, canStartRun]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStartNow() {
    sendRunStarted(seed, selectedType);
    startRun(partnerJoined);
  }
  function handleCancel() {
    sendRunCancelled();
    clearInterval(timerRef.current);
    onCancel?.();
  }

  const pct = countdown / COUNTDOWN_S;

  // ── Locked: already ran today ──────────────────────────────────────────────
  // Applies to BOTH solo starters and co-op joiners — one run per day total,
  // whether solo or co-op.
  if (!canStartRun) {
    return (
      <main ref={containerRef} style={{
        minHeight:"100svh", background:"#0a0e0a", color:"#f5e6c8",
        display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", gap:24, fontFamily:"monospace", padding:"0 24px",
      }}>
        <div style={{ textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
          <p style={{ fontSize:11, letterSpacing:"0.18em", color:"rgba(200,230,160,0.4)", textTransform:"uppercase", marginBottom:0 }}>
            run used
          </p>
          <h1 style={{ fontSize:26, fontWeight:400, color:"rgba(200,230,120,0.85)", letterSpacing:"0.05em", margin:0 }}>
            🌙 Already ran today
          </h1>
          <p style={{ fontSize:13, color:"rgba(245,230,200,0.45)", lineHeight:1.7, maxWidth:280 }}>
            You've used your run for today. Rest up and you'll be ready to head out again tomorrow.
          </p>
        </div>

        {/* Sleep hint card */}
        <div style={{
          display:"flex", alignItems:"center", gap:14,
          background:"rgba(120,160,255,0.05)", border:"1px solid rgba(120,160,255,0.18)",
          borderRadius:14, padding:"16px 22px", maxWidth:280, width:"100%",
        }}>
          <span style={{ fontSize:28, flexShrink:0 }}>🏠</span>
          <div>
            <div style={{ fontSize:12, color:"rgba(180,210,255,0.8)", marginBottom:4 }}>
              Go to sleep to reset
            </div>
            <div style={{ fontSize:11, color:"rgba(180,210,255,0.45)", lineHeight:1.5 }}>
              Press <span style={{ color:"rgba(180,210,255,0.85)", fontWeight:700 }}>[F]</span> at your house to end the day
            </div>
          </div>
        </div>

        <button onClick={onCancel} style={{
          padding:"12px 24px", borderRadius:10, cursor:"pointer",
          background:"transparent", border:"1px solid rgba(255,255,255,0.08)",
          color:"rgba(255,255,255,0.35)", fontSize:13, fontFamily:"monospace",
        }}>← back home</button>
      </main>
    );
  }

  // ── Run type picker (before confirming) ────────────────────────────────────
  if (!confirmed && !joining) {
    return (
      <main ref={containerRef} style={{
        minHeight:"100svh", background:"#0a0e0a", color:"#f5e6c8",
        display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", gap:24, fontFamily:"monospace", padding:"0 24px",
      }}>
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:11, letterSpacing:"0.18em", color:"rgba(200,230,160,0.5)", marginBottom:8, textTransform:"uppercase" }}>
            choose your run
          </p>
          <h1 style={{ fontSize:26, fontWeight:400, color:"rgba(200,230,160,0.9)", letterSpacing:"0.06em" }}>
            heading out...
          </h1>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:320 }}>
          {Object.entries(RUN_INFO).map(([type, ri]) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              style={{
                padding:"14px 16px", borderRadius:12, cursor:"pointer",
                background: selectedType === type ? `rgba(${type==="forest"?"200,230,120":type==="mining"?"220,180,80":type==="fruit"?"160,230,80":"80,200,255"},0.1)` : "rgba(255,255,255,0.03)",
                border: `1px solid ${selectedType === type ? ri.accent : "rgba(255,255,255,0.08)"}`,
                color: selectedType === type ? ri.accent : "rgba(245,230,200,0.5)",
                fontFamily:"monospace", textAlign:"left",
                transition:"all 0.15s ease",
              }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:24 }}>{ri.icon}</span>
                <div>
                  <div style={{ fontSize:13, marginBottom:3 }}>{ri.label}</div>
                  <div style={{ fontSize:10, opacity:0.6 }}>{ri.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:320 }}>
          {selectedType === "fishing" && equipment?.weapon !== "fishing_rod" && (
            <div style={{
              padding:"10px 14px", borderRadius:10,
              background:"rgba(255,150,40,0.08)", border:"1px solid rgba(255,150,40,0.3)",
              color:"rgba(255,180,80,0.85)", fontSize:11, fontFamily:"monospace", textAlign:"center",
            }}>
              🎣 you'll need a fishing rod equipped — you can still go but won't be able to fish
            </div>
          )}
          <button
            onClick={() => setConfirmed(true)}
            style={{
              padding:"15px", borderRadius:12, cursor:"pointer",
              background: "rgba(200,230,120,0.08)",
              border: "1px solid rgba(200,230,120,0.3)",
              color: "rgba(200,230,120,0.9)", fontSize:13, fontFamily:"monospace",
            }}
          >
            head out as {RUN_INFO[selectedType]?.icon} {RUN_INFO[selectedType]?.label} →
          </button>
          <button onClick={handleCancel} style={{
            padding:"10px", borderRadius:10, cursor:"pointer",
            background:"transparent", border:"1px solid rgba(255,255,255,0.08)",
            color:"rgba(255,255,255,0.3)", fontSize:12, fontFamily:"monospace",
          }}>← stay home</button>
        </div>
      </main>
    );
  }

  // ── Joining UI (waiting for queuer to broadcast run_started) ──────────────
  if (joining && !startedRef.current) {
    return (
      <main ref={containerRef} style={{
        minHeight:"100svh", background: info.bg,
        color:"#f5e6c8", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        gap:28, fontFamily:"monospace", padding:"0 24px",
      }}>
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:11, letterSpacing:"0.18em", color:"rgba(200,230,160,0.5)", marginBottom:8, textTransform:"uppercase" }}>joining run</p>
          <h1 style={{ fontSize:28, fontWeight:400, color:info.accent, letterSpacing:"0.06em" }}>{info.icon} {info.label}</h1>
          <p style={{ fontSize:13, color:"rgba(245,230,200,0.5)", marginTop:14, lineHeight:1.7 }}>
            Waiting for your partner to confirm the run…
          </p>
        </div>
        {/* Spinner */}
        <svg width="64" height="64" style={{ animation:"spin 1.2s linear infinite" }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(200,230,120,0.15)" strokeWidth="5"/>
          <path d="M32 6 A26 26 0 0 1 58 32" fill="none" stroke={info.accent} strokeWidth="5" strokeLinecap="round"/>
        </svg>
        <button onClick={handleCancel} style={{
          padding:"10px 20px", borderRadius:10, cursor:"pointer",
          background:"transparent", border:"1px solid rgba(255,255,255,0.08)",
          color:"rgba(255,255,255,0.3)", fontSize:12, fontFamily:"monospace",
        }}>← stay home</button>
      </main>
    );
  }

  // ── Countdown lobby ────────────────────────────────────────────────────────
  return (
    <main ref={containerRef} style={{
      minHeight:"100svh", background: info.bg,
      color:"#f5e6c8", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      gap:28, fontFamily:"monospace", padding:"0 24px",
    }}>
      <div style={{ textAlign:"center" }}>
        <p style={{ fontSize:11, letterSpacing:"0.18em", color:"rgba(200,230,160,0.5)", marginBottom:8, textTransform:"uppercase" }}>
          {info.label}
        </p>
        <h1 style={{ fontSize:28, fontWeight:400, color:info.accent, letterSpacing:"0.06em" }}>
          {info.icon} heading out...
        </h1>
      </div>

      <div style={{ position:"relative", width:120, height:120 }}>
        <svg width="120" height="120" style={{ position:"absolute", top:0, left:0, transform:"rotate(-90deg)" }}>
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
          <circle
            cx="60" cy="60" r="52" fill="none"
            stroke={partnerJoined ? "rgba(80,220,160,0.8)" : info.accent}
            strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct)}`}
            strokeLinecap="round"
            style={{ transition:"stroke-dashoffset 0.9s linear" }}
          />
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:34, fontWeight:400, color:"rgba(245,230,200,0.9)" }}>{countdown}</span>
          <span style={{ fontSize:10, color:"rgba(245,230,200,0.35)", letterSpacing:"0.1em" }}>seconds</span>
        </div>
      </div>

      <div style={{
        background:"rgba(255,255,255,0.04)",
        border:`1px solid ${partnerJoined ? "rgba(80,220,160,0.3)" : "rgba(255,255,255,0.08)"}`,
        borderRadius:12, padding:"14px 24px", textAlign:"center", minWidth:220,
      }}>
        {partnerJoined ? (
          <p style={{ fontSize:13, color:"rgba(80,220,160,0.9)" }}>✓ partner joined — co-op run!</p>
        ) : (
          <>
            <p style={{ fontSize:12, color:"rgba(245,230,200,0.4)", marginBottom:4 }}>waiting for partner to join...</p>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.2)" }}>auto-starts solo in {countdown}s</p>
          </>
        )}
      </div>

      <div style={{ maxWidth:300, textAlign:"center", fontSize:11, lineHeight:1.7, color:"rgba(245,230,200,0.28)", borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:16 }}>
        <p>{info.desc}</p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:260 }}>
        <button
          onClick={handleStartNow}
          style={{
            padding:"14px", borderRadius:10, border:`1px solid ${info.accent.replace("0.9","0.3")}`,
            background:`rgba(${info.accent.match(/[\d.]+,[\d.]+,[\d.]+/)?.[0] ?? "200,230,120"},0.08)`,
            color:info.accent, fontSize:13, fontFamily:"monospace", cursor:"pointer",
          }}
        >
          {partnerJoined ? "start co-op run →" : "go solo now →"}
        </button>
        <button onClick={handleCancel} style={{
          padding:"10px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)",
          background:"transparent", color:"rgba(255,255,255,0.3)", fontSize:12, fontFamily:"monospace", cursor:"pointer",
        }}>← stay home</button>
      </div>
    </main>
  );
}