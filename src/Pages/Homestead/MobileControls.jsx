// src/Pages/Homestead/MobileControls.jsx
//
// Virtual gamepad overlay for touch devices.
// Only renders when `'ontouchstart' in window` — invisible on desktop.
//
// Props:
//   keysRef      — the same keysRef the game loop reads; we write arrow-key
//                  entries directly so movement needs zero changes
//   onUseStart   — called on button press-down  (F-key / interact / attack)
//   onUseEnd     — called on button release      (needed for hold mechanics)
//   onUse        — convenience single-fire alias → maps to onUseStart only
//   onJump       — optional; Jump button only rendered when provided
//   onPause      — opens the pause overlay (top-left ≡ button)
//   onMenu       — optional; opens the tab/inventory menu (top-right 🎒 button)
//                  when provided a bag button appears in the top-right corner,
//                  used by runs so players can access their inventory on mobile
//
//   // Ghost placement mode (HomesteadView building placement)
//   ghostMode    — boolean; when true, Use becomes "Place" and a Cancel button appears
//   onGhostConfirm — called when the Place button is pressed
//   onGhostCancel  — called when the Cancel button is pressed
//
// Layout:
//
//   [ ≡ ]                              [ 🎒 ] (if onMenu provided)
//   [ Joystick ]          [ Cancel ] [ Use / Place ]
//                                    [ Jump ] (if onJump provided)

import React, { useEffect, useRef, useState, useCallback } from "react";

// ── constants ─────────────────────────────────────────────────────────────────
const ZONE_R   = 56;
const KNOB_R   = 22;
const DEADZONE = 0.22;

// ── helpers ───────────────────────────────────────────────────────────────────
const isTouchDevice = () => typeof window !== "undefined" && "ontouchstart" in window;
const clamp = (x, max) => Math.max(-max, Math.min(max, x));

// ── palette ───────────────────────────────────────────────────────────────────
const C = {
  ring:        "rgba(245,230,200,0.10)",
  ringBorder:  "rgba(245,230,200,0.18)",
  knob:        "rgba(245,230,200,0.22)",
  knobActive:  "rgba(245,230,200,0.38)",
  btn:         "rgba(245,230,200,0.13)",
  btnBorder:   "rgba(245,230,200,0.22)",
  btnActive:   "rgba(245,230,200,0.30)",
  btnText:     "rgba(245,230,200,0.70)",
  pause:       "rgba(245,230,200,0.09)",
  pauseBorder: "rgba(245,230,200,0.16)",
};

const baseBtn = {
  display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: "50%",
  border: `1.5px solid ${C.btnBorder}`,
  background: C.btn, color: C.btnText,
  fontFamily: "monospace", fontWeight: 700,
  userSelect: "none", WebkitUserSelect: "none",
  touchAction: "none", cursor: "pointer",
  transition: "background 0.08s, border-color 0.08s",
  WebkitTapHighlightColor: "transparent",
};

// ── Joystick ──────────────────────────────────────────────────────────────────
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
    const nx = dx / len, ny = dy / len;
    const T = 0.4;
    if (nx < -T) keysRef.current["ArrowLeft"]  = true; else delete keysRef.current["ArrowLeft"];
    if (nx >  T) keysRef.current["ArrowRight"] = true; else delete keysRef.current["ArrowRight"];
    if (ny < -T) keysRef.current["ArrowUp"]    = true; else delete keysRef.current["ArrowUp"];
    if (ny >  T) keysRef.current["ArrowDown"]  = true; else delete keysRef.current["ArrowDown"];
  }, [keysRef, clearKeys]);

  const onTouchStart = useCallback((e) => {
    e.preventDefault();
    if (touchId.current !== null) return;
    const touch = e.changedTouches[0];
    touchId.current = touch.identifier;
    const rect = zoneRef.current.getBoundingClientRect();
    centreRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setActive(true);
    const rdx = (touch.clientX - centreRef.current.x) / ZONE_R;
    const rdy = (touch.clientY - centreRef.current.y) / ZONE_R;
    setKnobPos({ x: clamp(rdx, 1) * ZONE_R, y: clamp(rdy, 1) * ZONE_R });
    applyDirection(rdx, rdy);
  }, [applyDirection]);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    let touch = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId.current) { touch = e.changedTouches[i]; break; }
    }
    if (!touch) return;
    const rdx = (touch.clientX - centreRef.current.x) / ZONE_R;
    const rdy = (touch.clientY - centreRef.current.y) / ZONE_R;
    setKnobPos({ x: clamp(rdx, 1) * ZONE_R, y: clamp(rdy, 1) * ZONE_R });
    applyDirection(rdx, rdy);
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
    <div ref={zoneRef} style={{
      position: "relative",
      width: ZONE_R * 2, height: ZONE_R * 2,
      borderRadius: "50%",
      background: C.ring, border: `1.5px solid ${C.ringBorder}`,
      touchAction: "none", flexShrink: 0,
    }}>
      {/* Crosshair guides */}
      <div style={{ position:"absolute", inset:0, borderRadius:"50%", overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", top:"50%", left:6, right:6, height:1, background:"rgba(245,230,200,0.07)", transform:"translateY(-50%)" }} />
        <div style={{ position:"absolute", left:"50%", top:6, bottom:6, width:1, background:"rgba(245,230,200,0.07)", transform:"translateX(-50%)" }} />
      </div>
      {/* Knob */}
      <div style={{
        position: "absolute",
        width: KNOB_R * 2, height: KNOB_R * 2,
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

// ── Generic action button ─────────────────────────────────────────────────────
// Supports both single-fire (onPressStart only) and hold (onPressStart + onPressEnd).
function ActionBtn({ label, size = 52, fontSize = 11, onPressStart, onPressEnd, accent = false, danger = false }) {
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

  // Colour schemes
  const bg     = danger
    ? (pressed ? "rgba(255,80,80,0.30)"    : "rgba(255,80,80,0.12)")
    : accent
      ? (pressed ? "rgba(245,200,120,0.32)" : "rgba(245,200,120,0.14)")
      : (pressed ? C.btnActive              : C.btn);
  const border = danger
    ? (pressed ? "rgba(255,80,80,0.55)"    : "rgba(255,80,80,0.28)")
    : accent
      ? (pressed ? "rgba(245,200,120,0.55)" : "rgba(245,200,120,0.30)")
      : (pressed ? "rgba(245,230,200,0.38)" : C.btnBorder);
  const color  = danger
    ? "rgba(255,140,140,0.90)"
    : accent
      ? "rgba(245,200,120,0.90)"
      : C.btnText;

  return (
    <div ref={ref} style={{
      ...baseBtn, width: size, height: size, fontSize,
      letterSpacing: "0.05em", textTransform: "uppercase",
      background: bg,
      border: `1.5px solid ${border}`,
      color,
      boxShadow: pressed && (accent || danger) ? `0 0 14px ${accent ? "rgba(245,200,120,0.20)" : "rgba(255,80,80,0.20)"}` : "none",
    }}>
      {label}
    </div>
  );
}

// ── Small icon button (pause / menu) ─────────────────────────────────────────
function IconBtn({ onPress, label = "≡" }) {
  const ref = useRef(null);
  const [pressed, setPressed] = useState(false);
  const handleTouchStart = useCallback((e) => { e.preventDefault(); setPressed(true);  onPress?.(); }, [onPress]);
  const handleTouchEnd   = useCallback((e) => { e.preventDefault(); setPressed(false); }, []);
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
      ...baseBtn, width: 36, height: 36, borderRadius: 8, fontSize: 16,
      background: pressed ? C.pause : "transparent",
      border: `1px solid ${C.pauseBorder}`,
      color: "rgba(245,230,200,0.45)",
    }}>{label}</div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function MobileControls({
  keysRef,
  // Use button (F-key / attack / interact)
  onUse,          // convenience single-fire alias → onUseStart
  onUseStart,
  onUseEnd,
  // Optional jump button (ForestRun, HomesteadView)
  onJump,
  // Top-left pause button
  onPause,
  // Top-right bag/menu button — optional; shown in runs so players can open
  // the tab menu without a keyboard. Pass: onMenu={() => setTabMenuOpen(true)}
  onMenu,
  // Ghost placement mode (HomesteadView building placement)
  ghostMode = false,
  onGhostConfirm,
  onGhostCancel,
}) {
  if (!isTouchDevice()) return null;

  const handleUseStart = onUseStart ?? onUse;
  const handleUseEnd   = onUseEnd   ?? undefined;

  return (
    <>
      {/* Top-left: pause */}
      <div style={{ position:"absolute", top:12, left:12, zIndex:30 }}>
        <IconBtn onPress={onPause} label="≡" />
      </div>

      {/* Top-right: bag / tab menu (runs only) */}
      {onMenu && (
        <div style={{ position:"absolute", top:12, right:12, zIndex:30 }}>
          <IconBtn onPress={onMenu} label="🎒" />
        </div>
      )}

      {/* Bottom row */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        paddingLeft: 16, paddingRight: 16,
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        pointerEvents: "none",
        zIndex: 20,
      }}>
        {/* Left: joystick */}
        <div style={{ pointerEvents: "auto" }}>
          <Joystick keysRef={keysRef} />
        </div>

        {/* Right: action cluster */}
        <div style={{
          pointerEvents: "auto",
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 10, paddingBottom: 4,
        }}>
          {/* Jump — shown in runs + homestead that have jump */}
          {onJump && !ghostMode && (
            <ActionBtn label="jump" size={50} fontSize={10} onPressStart={onJump} />
          )}

          {/* Ghost mode: Cancel + Place side by side */}
          {ghostMode ? (
            <div style={{ display:"flex", gap: 10, alignItems:"center" }}>
              <ActionBtn
                label="✕"
                size={50} fontSize={18}
                onPressStart={onGhostCancel}
                danger
              />
              <ActionBtn
                label="place"
                size={58} fontSize={10}
                onPressStart={onGhostConfirm}
                accent
              />
            </div>
          ) : (
            <ActionBtn
              label="use"
              size={58} fontSize={11}
              onPressStart={handleUseStart}
              onPressEnd={handleUseEnd}
              accent
            />
          )}
        </div>
      </div>
    </>
  );
}