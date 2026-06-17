// Section.jsx — shared collapsible section wrapper
// Used inside zone components to collapse long panels.

import React, { useState } from "react";

export default function Section({ title, defaultOpen = true, children, badge }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 0",
          background: "transparent",
          border: "none",
          borderBottom: `1px solid ${open ? "rgba(255,255,255,0.06)" : "transparent"}`,
          color: "rgba(255,255,255,0.35)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: "pointer",
          textAlign: "left",
          marginBottom: open ? 10 : 0,
          transition: "border-color 0.15s",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {title}
          {badge != null && (
            <span style={{
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 10,
              background: "rgba(255,200,60,0.12)",
              border: "1px solid rgba(255,200,60,0.25)",
              color: "rgba(255,200,60,0.85)",
              letterSpacing: "0.02em",
            }}>
              {badge}
            </span>
          )}
        </span>
        <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 8 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}