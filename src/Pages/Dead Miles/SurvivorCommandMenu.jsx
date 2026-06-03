// src/Pages/DeadMiles/SurvivorCommandMenu.jsx
// Survivor command menu modal — extracted from GameView.jsx

import React from "react";

export default function SurvivorCommandMenu({ survivor, onClose, onCommand, onTogglePriority }) {
  const commands = [
    { cmd: "follow",    label: "Follow me",    icon: "🟡", desc: "Walks near you, fights if needed" },
    { cmd: "stay_here", label: "Stay here",    icon: "🟤", desc: "Holds position, defends area" },
    { cmd: "stay_safe", label: "Stay safe",    icon: "🟢", desc: "Retreats from zombies, wanders nearby" },
    { cmd: "fight",     label: "Fight",        icon: "🔴", desc: "Actively hunts nearby zombies" },
    { cmd: "assign",    label: "Assign to…",   icon: "🔵", desc: "Walk to a turret or crop plot to assign" },
    { cmd: "convoy",    label: "Drive convoy", icon: "🚗", desc: "Takes a free vehicle and follows your trail" },
  ];
  const colMap = {
    follow:    "rgba(255,200,60,0.9)",
    stay_here: "rgba(200,150,80,0.9)",
    stay_safe: "rgba(120,220,80,0.9)",
    fight:     "rgba(255,100,100,0.9)",
    assign:    "rgba(80,200,255,0.9)",
    convoy:    "rgba(80,220,200,0.9)",
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-30"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-2xl overflow-hidden" style={{ width: 320, background: "rgba(8,9,12,0.97)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <span className="text-sm font-medium" style={{ color: "rgba(255,220,80,0.9)" }}>👤 {survivor.name}</span>
            <span className="ml-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>HP {survivor.hp}/{survivor.maxHp}</span>
          </div>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded" style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)" }}>Esc</button>
        </div>

        <div className="px-4 py-3 flex flex-col gap-2">
          {commands.map(({ cmd, label, icon, desc }) => (
            <button
              key={cmd}
              onClick={() => onCommand(cmd)}
              className="flex items-start gap-3 p-3 rounded-xl text-left w-full"
              style={{
                background: survivor.command === cmd
                  ? `${(colMap[cmd] ?? "rgba(255,255,255,0.9)").replace("0.9", "0.1")}`
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${survivor.command === cmd
                  ? (colMap[cmd] ?? "rgba(255,255,255,0.3)").replace("0.9", "0.35")
                  : "rgba(255,255,255,0.07)"}`,
                cursor: "pointer",
              }}
            >
              <span className="text-sm mt-0.5">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium" style={{ color: survivor.command === cmd ? (colMap[cmd] ?? "rgba(255,255,255,0.9)") : "rgba(255,255,255,0.7)" }}>
                  {label} {survivor.command === cmd ? "✓" : ""}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{desc}</div>
              </div>
            </button>
          ))}
        </div>

        {survivor.command === "assign" && survivor.assignedTo?.structureType === "crop" && (
          <div className="px-4 pb-4">
            <button
              onClick={onTogglePriority}
              className="w-full py-2 rounded-lg text-xs"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
            >
              Priority: <span style={{ color: "rgba(255,220,80,0.85)" }}>
                {survivor.priority === "safety_first" ? "⚠️ Safety first (flee zombies)" : "🌿 Harvest first (ignore zombies)"}
              </span> — tap to toggle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}