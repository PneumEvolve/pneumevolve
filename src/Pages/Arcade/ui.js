// src/Pages/Arcade/ui.js — shared look for arcade screens (lobby, waiting, home).

export const C = {
  bg:      "#0d0b1a",
  panel:   "rgba(255,255,255,0.04)",
  border:  "rgba(255,255,255,0.10)",
  text:    "#f3ecff",
  dim:     "rgba(243,236,255,0.45)",
  faint:   "rgba(243,236,255,0.22)",
  accent:  "#ffcc4d",
  accent2: "#7ee0ff",
  good:    "#7ee081",
  bad:     "#ff7a6b",
};

export const S = {
  screen: {
    minHeight: "100svh", background: C.bg, color: C.text,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 20, padding: "24px", boxSizing: "border-box",
    fontFamily: "ui-rounded, 'Nunito', system-ui, sans-serif",
  },
  eyebrow: { fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", color: C.dim, margin: 0 },
  title:   { fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: "0.02em" },
  col:     { display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 340 },
  card: {
    display: "flex", alignItems: "center", gap: 14, width: "100%", boxSizing: "border-box",
    padding: "16px 18px", borderRadius: 16, border: `1px solid ${C.border}`, background: C.panel,
    color: C.text, textAlign: "left", cursor: "pointer", fontFamily: "inherit",
  },
  btn: (kind = "primary") => ({
    width: "100%", boxSizing: "border-box", padding: "15px 16px", borderRadius: 14,
    fontSize: 16, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
    ...(kind === "primary" ? { background: C.accent, color: "#1a1300", border: "none" } : {}),
    ...(kind === "ghost"   ? { background: "transparent", color: C.dim, border: `1px solid ${C.border}`, fontWeight: 600, fontSize: 14 } : {}),
  }),
  input: {
    flex: 1, minWidth: 0, padding: "15px 14px", borderRadius: 14, boxSizing: "border-box",
    background: C.panel, border: `1px solid ${C.border}`, color: C.text,
    fontSize: 22, letterSpacing: "0.35em", textAlign: "center", fontFamily: "monospace", outline: "none",
  },
  error: { color: C.bad, fontSize: 14, textAlign: "center", margin: 0 },
};
