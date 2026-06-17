// SlidePanel.jsx — slide-out panel rendered over the homebase GameView.
// Replaces the old BaseView-as-screen + BaseNav tab-bar approach.
// The live sim stays running behind it (dimmed but not paused).
//
// Usage:
//   <SlidePanel open={panelOpen} title="Workshop" onClose={() => setPanelOpen(false)}>
//     <BaseWorkshop ... />
//   </SlidePanel>

import React, { useEffect } from "react";

export default function SlidePanel({ open, title, icon, onClose, children, width = 400 }) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop — tap to close */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "rgba(0,0,0,0.45)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: Math.min(width, window.innerWidth - 32),
          zIndex: 41,
          background: "#0a0d10",
          borderLeft: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.55)",
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.22s cubic-bezier(0.32,0,0.2,1)",
          willChange: "transform",
        }}
        // Stop backdrop click from leaking through
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}>
          {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
          <div style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: "rgba(255,255,255,0.82)",
          }}>
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "5px 9px",
              background: "none",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 7,
              color: "rgba(255,255,255,0.4)",
              fontSize: 11,
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            ✕ close
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 18px 24px",
          WebkitOverflowScrolling: "touch",
        }}>
          {children}
        </div>
      </div>
    </>
  );
}