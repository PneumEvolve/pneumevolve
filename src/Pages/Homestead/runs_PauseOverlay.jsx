// src/Pages/Homestead/runs_PauseOverlay.jsx
//
// Shared pause / abandon overlay shown when the player presses Escape mid-run.
// Each run was hand-rolling this with slightly different colours; this is one
// component with a `theme` prop for the accent colour.
//
// Usage:
//   <PauseOverlay
//     open={pauseOpen}
//     theme="forest"
//     runLabel="🌲 Forest Run"
//     onResume={() => setPauseOpen(false)}
//     onAbandon={() => { setPauseOpen(false); finishRun(); }}
//   />

import React from "react";

// Themes match the colours each run was using inline before the extraction.
// Each entry is { backdrop, bgBox, borderRgb, accentRgb } where borderRgb /
// accentRgb are the "r,g,b" portion of an rgba() (no alpha) — alphas are
// applied per use-site.
const THEMES = {
  forest:  { backdrop: "rgba(4,10,4,0.82)",  bgBox: "#111a0b", rgb: "200,230,120", eyeRgb: "200,230,160" },
  mining:  { backdrop: "rgba(4,4,10,0.82)",  bgBox: "#0e0e18", rgb: "160,180,230", eyeRgb: "160,180,230", accentRgb: "180,210,255" },
  fruit:   { backdrop: "rgba(4,12,4,0.82)",  bgBox: "#0e1a0a", rgb: "180,230,120", eyeRgb: "180,230,120" },
  fishing: { backdrop: "rgba(4,10,20,0.82)", bgBox: "#0a1420", rgb: "80,200,255",  eyeRgb: "80,200,255" },
};

export function PauseOverlay({ open, theme = "forest", runLabel, onResume, onAbandon }) {
  if (!open) return null;
  const t = THEMES[theme] ?? THEMES.forest;
  const accent = t.accentRgb ?? t.rgb;
  return (
    <div style={{
      position:"absolute", inset:0,
      background: t.backdrop,
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:30,
    }}>
      <div style={{
        background: t.bgBox, border: `1px solid rgba(${t.rgb},0.25)`,
        borderRadius:16, padding:"28px 32px",
        maxWidth:300, width:"90%",
        fontFamily:"monospace", color:"#f5e6c8", textAlign:"center",
        display:"flex", flexDirection:"column", gap:14,
      }}>
        <p style={{ fontSize:10, letterSpacing:"0.18em", color:`rgba(${t.eyeRgb},0.4)`, textTransform:"uppercase" }}>paused</p>
        {runLabel && (
          <h2 style={{ fontSize:20, fontWeight:400, color:`rgba(${accent},0.9)` }}>{runLabel}</h2>
        )}
        <button
          onClick={onResume}
          style={{
            padding:"13px", borderRadius:10,
            border:`1px solid rgba(${t.rgb},0.35)`,
            background:`rgba(${t.rgb},0.1)`,
            color:`rgba(${accent},0.95)`,
            fontSize:13, fontFamily:"monospace", cursor:"pointer",
          }}
        >▶ Resume</button>
        {onAbandon && (
          <button
            onClick={onAbandon}
            style={{
              padding:"10px", borderRadius:10,
              border:"1px solid rgba(255,150,100,0.3)",
              background:"rgba(255,100,60,0.07)",
              color:"rgba(255,160,120,0.85)",
              fontSize:12, fontFamily:"monospace", cursor:"pointer",
            }}
          >Abandon run (keep loot so far)</button>
        )}
      </div>
    </div>
  );
}
