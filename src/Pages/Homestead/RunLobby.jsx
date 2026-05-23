// src/Pages/Homestead/RunLobby.jsx
// 30-second window where partner can join before run starts solo.
// If partner joins → co-op. If countdown expires → solo.

import React, { useEffect, useRef, useState } from "react";
import { useHearthroom } from "./useHearthroom";

const COUNTDOWN_S = 30;

export default function RunLobby({ room, role, onRunStart, onCancel, joining = false, joinSeed = null }) {
  const [countdown,    setCountdown]    = useState(COUNTDOWN_S);
  const [partnerJoined, setPartnerJoined] = useState(joining); // if we're joining, partner is "already there"
  const [seed]         = useState(() => joining && joinSeed ? joinSeed : (Date.now() & 0x7fffffff));
  const timerRef       = useRef(null);
  const startedRef     = useRef(false);

  function startRun(coOp) {
    if (startedRef.current) return;
    startedRef.current = true;
    clearInterval(timerRef.current);
    onRunStart({ seed, coOp });
  }

  const handlers = useRef({
    onRunJoined: ({ playerId }) => {
      setPartnerJoined(true);
      // Partner actively accepted the join prompt — start immediately
      if (!startedRef.current) {
        startedRef.current = true;
        clearInterval(timerRef.current);
        onRunStart({ seed, coOp: true });
      }
    },
    onRunStarted: ({ seed: remoteSeed }) => {
      // Partner triggered the start (they were host) — join their seed
      if (!startedRef.current) {
        startedRef.current = true;
        clearInterval(timerRef.current);
        onRunStart({ seed: remoteSeed, coOp: true });
      }
    },
    onRunCancelled: () => {
      clearInterval(timerRef.current);
      onCancel?.();
    },
  }).current;

  const { sendRunQueued, sendRunJoined, sendRunStarted, sendRunCancelled } =
    useHearthroom(room?.id ?? null, handlers);

  useEffect(() => {
    if (joining) {
      // We're the partner joining — announce ourselves and start immediately
      sendRunJoined("p2");
      startRun(true);
      return;
    }
    // We're the host — broadcast the queue and start the countdown
    sendRunQueued("forest", seed);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleJoinAsPartner() {
    sendRunJoined("p2");
    setPartnerJoined(true);
  }

  function handleStartNow() {
    sendRunStarted(seed);
    startRun(partnerJoined);
  }

  function handleCancel() {
    sendRunCancelled();
    clearInterval(timerRef.current);
    onCancel?.();
  }

  const pct = countdown / COUNTDOWN_S;

  return (
    <main style={{
      minHeight: "100svh",
      background: "#0a120a",
      color: "#f5e6c8",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 28,
      fontFamily: "monospace",
      padding: "0 24px",
    }}>
      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 11, letterSpacing: "0.18em", color: "rgba(200,230,160,0.5)", marginBottom: 8, textTransform: "uppercase" }}>
          forest run
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 400, color: "rgba(200,230,160,0.9)", letterSpacing: "0.06em" }}>
          heading out...
        </h1>
      </div>

      {/* Countdown ring */}
      <div style={{ position: "relative", width: 120, height: 120 }}>
        <svg width="120" height="120" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke={partnerJoined ? "rgba(80,220,160,0.8)" : "rgba(200,230,120,0.8)"}
            strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.9s linear" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 34, fontWeight: 400, color: "rgba(245,230,200,0.9)" }}>{countdown}</span>
          <span style={{ fontSize: 10, color: "rgba(245,230,200,0.35)", letterSpacing: "0.1em" }}>seconds</span>
        </div>
      </div>

      {/* Partner status */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${partnerJoined ? "rgba(80,220,160,0.3)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 12,
        padding: "14px 24px",
        textAlign: "center",
        minWidth: 220,
      }}>
        {partnerJoined ? (
          <p style={{ fontSize: 13, color: "rgba(80,220,160,0.9)" }}>✓ partner joined — co-op run!</p>
        ) : (
          <>
            <p style={{ fontSize: 12, color: "rgba(245,230,200,0.4)", marginBottom: 4 }}>
              waiting for partner to join...
            </p>
            <p style={{ fontSize: 10, color: "rgba(245,230,200,0.2)" }}>
              auto-starts solo in {countdown}s
            </p>
          </>
        )}
      </div>

      {/* Tip */}
      <div style={{
        maxWidth: 300,
        textAlign: "center",
        fontSize: 11,
        lineHeight: 1.7,
        color: "rgba(245,230,200,0.28)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingTop: 16,
      }}>
        <p>You start unarmed. Punch wolves to start. Collect sticks + stones to craft an axe back at the homestead.</p>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 260 }}>
        <button
          onClick={handleStartNow}
          style={{
            padding: "14px",
            borderRadius: 10,
            border: "1px solid rgba(200,230,120,0.3)",
            background: "rgba(200,230,120,0.08)",
            color: "rgba(200,230,120,0.9)",
            fontSize: 13,
            fontFamily: "monospace",
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          {partnerJoined ? "start co-op run →" : "go solo now →"}
        </button>
        <button
          onClick={handleCancel}
          style={{
            padding: "10px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent",
            color: "rgba(255,255,255,0.3)",
            fontSize: 12,
            fontFamily: "monospace",
            cursor: "pointer",
          }}
        >
          ← stay home
        </button>
      </div>
    </main>
  );
}