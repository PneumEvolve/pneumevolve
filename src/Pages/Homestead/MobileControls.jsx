// src/Pages/Homestead/MobileControls.jsx
//
// Virtual gamepad overlay for touch devices.
// Only renders when `'ontouchstart' in window` — invisible on desktop.
//
// Props:
//   keysRef     — the same ref useRunLoop exposes; we write arrow-key entries
//                 directly so the game loop reads them on the next tick
//   onUseStart  — called on touchstart of the Use button (press down)
//   onUseEnd    — called on touchend/cancel of the Use button (release)
//   onUse       — convenience: called on touchstart when you only need a single
//                 fire (no hold mechanic). Internally maps to onUseStart.
//   onJump      — optional; when provided a Jump button is rendered (ForestRun)
//   onPause     — called when the ≡ button is tapped (opens pause overlay)
//
// Layout (portrait, bottom of screen):
//
//   [ ≡ ]                        [ Jump ]
//   [ D-pad / joystick zone ]    [  Use ]
//
// The joystick zone is a fixed circle bottom-left.  A thumb-knob tracks the
// finger inside it and sets arrow-key states on keysRef based on angle +
// deadzone.  Keys are cleared on touchend / touchcancel.

import React, { useEffect, useRef, useState, useCallback } from "react";

// ── constants ────────────────────────────────────────────────────────────────
const ZONE_R   = 56;   // radius of the outer ring (px)
const KNOB_R   = 22;   // radius of the thumb knob
const DEADZONE = 0.22; // fraction of ZONE_R below which no direction is set

// ── helpers ──────────────────────────────────────────────────────────────────
const isTouchDevice = () => typeof window !== "undefined" && "ontouchstart" in window;

/** Clamp x to [-max, max] */
const clamp = (x, max) => Math.max(-max, Math.min(max, x));

// ── styles ───────────────────────────────────────────────────────────────────
const C = {
  ring:       "rgba(245,230,200,0.10)",
  ringBorder: "rgba(245,230,200,0.18)",
  knob:       "rgba(245,230,200,0.22)",
  knobActive: "rgba(245,230,200,0.38)",
  btn:        "rgba(245,230,200,0.13)",
  btnBorder:  "rgba(245,230,200,0.22)",
  btnActive:  "rgba(245,230,200,0.30)",
  btnText:    "rgba(245,230,200,0.70)",
  pause:      "rgba(245,230,200,0.09)",
  pauseBorder:"rgba(245,230,200,0.16)",
};

const baseBtn = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  border: `1.5px solid ${C.btnBorder}`,
  background: C.btn,
  color: C.btnText,
  fontFamily: "monospace",
  fontWeight: 700,
  userSelect: "none",
  WebkitUserSelect: "none",
  touchAction: "none",
  cursor: "pointer",
  transition: "background 0.08s, border-color 0.08s",
  WebkitTapHighlightColor: "transparent",
};

// ── Joystick ─────────────────────────────────────────────────────────────────
function Joystick({ keysRef }) {
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [active,  setActive]  = useState(false);
  const touchId   = useRef(null);
  const zoneRef   = useRef(null);
  const centreRef = useRef({ x: 0, y: 0 });

  const clearKeys = useCallback(() => {
    if (!keysRef?.current) return;
    delete keysRef.current["ArrowLeft"];
    delete keysRef.current["ArrowRight"];
    delete keysRef.current["ArrowUp"];
    delete keysRef.current["ArrowDown"];
  }, [keysRef]);

  const applyDirection = useCallback((dx, dy) => {
    if (!keysRef?.current) return;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < DEADZONE) { clearKeys(); return; }
    const nx = dx / len;
    const ny = dy / len;
    const THRESH = 0.4;
    if (nx < -THRESH) keysRef.current["ArrowLeft"]  = true; else delete keysRef.current["ArrowLeft"];
    if (nx >  THRESH) keysRef.current["ArrowRight"] = true; else delete keysRef.current["ArrowRight"];
    if (ny < -THRESH) keysRef.current["ArrowUp"]    = true; else delete keysRef.current["ArrowUp"];
    if (ny >  THRESH) keysRef.current["ArrowDown"]  = true; else delete keysRef.current["ArrowDown"];
  }, [keysRef, clearKeys]);

  const onTouchStart = useCallback((e) => {
    e.preventDefault();
    if (touchId.current !== null) return;
    const touch = e.changedTouches[0];
    touchId.current = touch.identifier;
    const rect = zoneRef.current.getBoundingClientRect();
    centreRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setActive(true);
    const rawDx = (touch.clientX - centreRef.current.x) / ZONE_R;
    const rawDy = (touch.clientY - centreRef.current.y) / ZONE_R;
    setKnobPos({ x: clamp(rawDx, 1) * ZONE_R, y: clamp(rawDy, 1) * ZONE_R });
    applyDirection(rawDx, rawDy);
  }, [applyDirection]);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    let touch = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId.current) { touch = e.changedTouches[i]; break; }
    }
    if (!touch) return;
    const rawDx = (touch.clientX - centreRef.current.x) / ZONE_R;
    const rawDy = (touch.clientY - centreRef.current.y) / ZONE_R;
    setKnobPos({ x: clamp(rawDx, 1) * ZONE_R, y: clamp(rawDy, 1) * ZONE_R });
    applyDirection(rawDx, rawDy);
  }, [applyDirection]);

  const onTouchEnd = useCallback((e) => {
    e.preventDefault();
    let found = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId.current) { found = true; break; }
    }
    if (!found) return;
    touchId.current = null;
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    clearKeys();
  }, [clearKeys]);

  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;
    el.addEventListener("touchstart",  onTouchStart, { passive: false });
    el.addEventListener("touchmove",   onTouchMove,  { passive: false });
    el.addEventListener("touchend",    onTouchEnd,   { passive: false });
    el.addEventListener("touchcancel", onTouchEnd,   { passive: false });
    return () => {
      el.removeEventListener("touchstart",  onTouchStart);
      el.removeEventListener("touchmove",   onTouchMove);
      el.removeEventListener("touchend",    onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  return (
    <div
      ref={zoneRef}
      style={{
        position: "relative",
        width:  ZONE_R * 2,
        height: ZONE_R * 2,
        borderRadius: "50%",
        background: C.ring,
        border: `1.5px solid ${C.ringBorder}`,
        touchAction: "none",
        flexShrink: 0,
      }}
    >
      <div style={{ position:"absolute", inset:0, borderRadius:"50%", overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", top:"50%", left:6, right:6, height:1, background:"rgba(245,230,200,0.07)", transform:"translateY(-50%)" }} />
        <div style={{ position:"absolute", left:"50%", top:6, bottom:6, width:1, background:"rgba(245,230,200,0.07)", transform:"translateX(-50%)" }} />
      </div>
      <div style={{
        position: "absolute",
        width:  KNOB_R * 2,
        height: KNOB_R * 2,
        borderRadius: "50%",
        background: active ? C.knobActive : C.knob,
        border: `1.5px solid rgba(245,230,200,${active ? 0.35 : 0.22})`,
        top: "50%", left: "50%",
        transform: `translate(calc(-50% + ${knobPos.x}px), calc(-50% + ${knobPos.y}px))`,
        transition: active ? "none" : "transform 0.15s ease, background 0.1s",
        pointerEvents: "none",
        boxShadow: active ? "0 0 12px rgba(245,230,200,0.15)" : "none",
      }} />
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────
// Supports both single-fire (onPress) and hold (onPressStart / onPressEnd).
function ActionBtn({ label, size = 52, fontSize = 11, onPressStart, onPressEnd, accent = false }) {
  const [pressed, setPressed] = useState(false);
  const touchId = useRef(null);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    if (touchId.current !== null) return;
    touchId.current = e.changedTouches[0].identifier;
    setPressed(true);
    onPressStart?.();
  }, [onPressStart]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    let found = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId.current) { found = true; break; }
    }
    if (!found) return;
    touchId.current = null;
    setPressed(false);
    onPressEnd?.();
  }, [onPressEnd]);

  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("touchstart",  handleTouchStart, { passive: false });
    el.addEventListener("touchend",    handleTouchEnd,   { passive: false });
    el.addEventListener("touchcancel", handleTouchEnd,   { passive: false });
    return () => {
      el.removeEventListener("touchstart",  handleTouchStart);
      el.removeEventListener("touchend",    handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return (
    <div
      ref={ref}
      style={{
        ...baseBtn,
        width: size, height: size, fontSize,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        background: pressed
          ? (accent ? "rgba(245,200,120,0.32)" : C.btnActive)
          : (accent ? "rgba(245,200,120,0.14)" : C.btn),
        border: `1.5px solid ${pressed
          ? (accent ? "rgba(245,200,120,0.55)" : "rgba(245,230,200,0.38)")
          : (accent ? "rgba(245,200,120,0.30)" : C.btnBorder)}`,
        color: accent ? "rgba(245,200,120,0.90)" : C.btnText,
        boxShadow: pressed && accent ? "0 0 14px rgba(245,200,120,0.20)" : "none",
      }}
    >
      {label}
    </div>
  );
}

// ── Pause / menu button ───────────────────────────────────────────────────────
function PauseBtn({ onPress }) {
  const ref = useRef(null);
  const [pressed, setPressed] = useState(false);

  const handleTouchStart = useCallback((e) => { e.preventDefault(); setPressed(true);  onPress?.(); }, [onPress]);
  const handleTouchEnd   = useCallback((e) => { e.preventDefault(); setPressed(false); },              []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("touchstart",  handleTouchStart, { passive: false });
    el.addEventListener("touchend",    handleTouchEnd,   { passive: false });
    el.addEventListener("touchcancel", handleTouchEnd,   { passive: false });
    return () => {
      el.removeEventListener("touchstart",  handleTouchStart);
      el.removeEventListener("touchend",    handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return (
    <div ref={ref} style={{
      ...baseBtn,
      width: 36, height: 36, borderRadius: 8, fontSize: 16,
      background: pressed ? C.pause : "transparent",
      border: `1px solid ${C.pauseBorder}`,
      color: "rgba(245,230,200,0.45)",
    }}>
      ≡
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function MobileControls({
  keysRef,
  onUse,        // convenience single-fire alias → maps to onUseStart
  onUseStart,   // called on button press down
  onUseEnd,     // called on button release (needed for hold mechanics)
  onJump,
  onPause,
}) {
  if (!isTouchDevice()) return null;

  // Allow callers to pass either `onUse` (simple) or `onUseStart`/`onUseEnd` (hold)
  const handleUseStart = onUseStart ?? onUse;
  const handleUseEnd   = onUseEnd   ?? undefined;

  return (
    <>
      {/* Pause button — top-left */}
      <div style={{ position:"absolute", top:12, left:12, zIndex:30 }}>
        <PauseBtn onPress={onPause} />
      </div>

      {/* Bottom controls row */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        paddingLeft: 16, paddingRight: 16,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        pointerEvents: "none",
        zIndex: 20,
      }}>
        <div style={{ pointerEvents: "auto" }}>
          <Joystick keysRef={keysRef} />
        </div>

        <div style={{
          pointerEvents: "auto",
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 10, paddingBottom: 4,
        }}>
          {onJump && (
            <ActionBtn label="jump" size={50} fontSize={10} onPressStart={onJump} />
          )}
          <ActionBtn
            label="use"
            size={58}
            fontSize={11}
            onPressStart={handleUseStart}
            onPressEnd={handleUseEnd}
            accent
          />
        </div>
      </div>
    </>
  );
}