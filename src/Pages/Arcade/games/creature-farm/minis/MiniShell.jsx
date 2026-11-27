// Shared look for the small signpost games: full-screen frame, buttons, creature picker.
import React from "react";
import { C } from "../../../ui";
import { Portrait } from "../RanchPanel";
import { typeLabel } from "../eggs";

export const P_COLORS = ["#ffd65a", "#6fd3ff"];

export function Shell({ title, onLeave, right, children, bg = "#0f1a14" }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, background: bg, color: C.text, display: "flex", flexDirection: "column", fontFamily: "ui-rounded, 'Nunito', system-ui, sans-serif", userSelect: "none", WebkitUserSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={onLeave} style={btn(false)}>← farm</button>
        <div style={{ fontWeight: 900, fontSize: 17, flex: 1 }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function btn(active = false, extra = {}) {
  return {
    padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800,
    background: active ? C.accent : "rgba(255,255,255,0.06)", color: active ? "#1a1300" : C.text,
    border: active ? "none" : "1px solid rgba(255,255,255,0.15)", touchAction: "manipulation", ...extra,
  };
}
export const bigBtn = (on = true) => btn(on, { padding: "12px 22px", fontSize: 17, borderRadius: 14, opacity: on ? 1 : 0.5 });

export function Section({ title, children }) {
  return <div style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 8 }}>{title && <div style={{ fontWeight: 900 }}>{title}</div>}{children}</div>;
}

export const traitsOf = (c) => c.traits || { hue: c.hue ?? 0, size: 1 };
export function Pic({ c, size = 48 }) {
  return <Portrait species={c.species} traits={traitsOf(c)} size={size} />;
}

// Pick one of your grown-up creatures (not away, not a baby, not nesting).
export function canEnter(c, userId) {
  return c && !c.away && c.grow == null && !c.nest && (c.owner === String(userId) || (c.bond?.[String(userId)] || 0) >= 50);
}
export function CreaturePick({ world, userId, picked, taken = [], onPick, sub }) {
  const list = Object.values(world.creatures || {}).filter(c => canEnter(c, userId));
  if (!list.length) return <div style={{ fontSize: 12, color: C.dim }}>No creatures free right now.</div>;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {list.map(c => {
        const on = picked === c.id, gone = taken.includes(c.id);
        return (
          <button key={c.id} disabled={gone} onClick={() => onPick(c.id)} style={btn(on, { padding: 8, width: 190, display: "flex", alignItems: "center", gap: 8, textAlign: "left", opacity: gone ? 0.35 : 1 })}>
            <Pic c={c} size={40} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 900, fontSize: 13 }}>{c.name}{c.traits?.rare ? " ★" : ""}</span>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, opacity: 0.8 }}>{typeLabel(c)}</span>
              {sub && <span style={{ display: "block", fontSize: 10, fontWeight: 600, opacity: 0.7 }}>{sub(c)}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Stars({ n, size = 30 }) {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {[0, 1, 2].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"><path d="M12 2l2.9 6.5 7.1.7-5.3 4.8 1.5 7-6.2-3.6L5.8 21l1.5-7L2 9.2l7.1-.7z" fill={i < n ? "#ffd65a" : "rgba(255,255,255,0.12)"} stroke={i < n ? "#e0a82e" : "none"} strokeWidth="1" /></svg>
      ))}
    </span>
  );
}

// A rosette ribbon, drawn as SVG. color by place/kind.
export const RIBBON_COLORS = { gold: "#ffd65a", silver: "#d6dde8", bronze: "#e0995a", blue: "#6fa8ff", pink: "#ff8ac4", green: "#7fdc8a", purple: "#b88aff" };
export function Ribbon({ color = "gold", size = 34, label }) {
  const c = RIBBON_COLORS[color] || color;
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 30 39" aria-label={label}>
      <path d="M9 18 L5 37 L11 33 L14 38 L15 20Z" fill={c} opacity="0.85" />
      <path d="M21 18 L25 37 L19 33 L16 38 L15 20Z" fill={c} opacity="0.7" />
      {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <circle key={i} cx={15 + Math.cos(a) * 9} cy={13 + Math.sin(a) * 9} r="4" fill={c} />; })}
      <circle cx="15" cy="13" r="8" fill="#fff8e6" />
      <circle cx="15" cy="13" r="5.5" fill={c} />
    </svg>
  );
}