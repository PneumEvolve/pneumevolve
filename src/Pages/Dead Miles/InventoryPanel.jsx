// src/Pages/DeadMiles/InventoryPanel.jsx
// Inventory panel modal — extracted from GameView.jsx

import React from "react";

export const ITEM_META = {
  food:         { icon: "🍞", name: "Food",         desc: "Press Q to eat (+25 food)" },
  water:        { icon: "💧", name: "Water",        desc: "Press R to drink (+30 water)" },
  wood:         { icon: "🪵", name: "Wood",         desc: "Used for barricading & building" },
  nails:        { icon: "📌", name: "Nails",        desc: "Used for barricading & building" },
  scrap:        { icon: "⚙️",  name: "Scrap Metal", desc: "Crafting ingredient" },
  medkit:       { icon: "🩹", name: "Medkit",       desc: "Heals +40 HP instantly" },
  bat:          { icon: "🪓", name: "Baseball Bat", desc: "Melee weapon — auto-equipped" },
  seeds:        { icon: "🌱", name: "Seeds",        desc: "Plant in a garden (F near plot)" },
  car_parts:    { icon: "⚙️",  name: "Car Parts",  desc: "Press E near vehicle to repair (+40 HP)" },
  fuel:         { icon: "⛽", name: "Fuel",         desc: "Auto-applied to vehicle tank" },
  map_fragment: { icon: "🗺️", name: "Map Fragment", desc: "Shows the highway exit — drive north!" },
};

export default function InventoryPanel({ inventory, player, onClose, onEat, onDrink }) {
  const items = Object.entries(inventory || {}).filter(([, qty]) => qty > 0);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-30"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-2xl overflow-hidden" style={{ width: 380, maxHeight: "80vh", background: "rgba(8,9,12,0.97)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-sm font-medium tracking-widest uppercase" style={{ color: "rgba(255,200,80,0.85)" }}>Shared Inventory</span>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded" style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)" }}>
            ESC / close
          </button>
        </div>

        {player && (
          <div className="px-5 py-3 grid grid-cols-2 gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {[
              { label: "Health", val: player.hp,    color: "#ff5555" },
              { label: "Food",   val: player.food,  color: "#f0a030" },
              { label: "Water",  val: player.water, color: "#44aaff" },
              { label: "Sleep",  val: player.sleep, color: "#9966ff" },
            ].map(n => (
              <div key={n.label} className="flex items-center gap-2">
                <span className="text-xs w-12" style={{ color: "rgba(255,255,255,0.4)" }}>{n.label}</span>
                <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,0.08)" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.max(0, Math.min(100, n.val))}%`,
                    background: n.val < 20 ? "#ff3333" : n.val < 40 ? "#ff9900" : n.color,
                    transition: "width 0.3s",
                  }} />
                </div>
                <span className="text-xs w-6 text-right" style={{ color: "rgba(255,255,255,0.3)" }}>{Math.floor(n.val)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="px-5 py-3 flex gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={onEat}
            className="flex-1 py-2 rounded-lg text-xs font-medium"
            style={{ background: "rgba(240,160,48,0.12)", border: "1px solid rgba(240,160,48,0.25)", color: "rgba(240,160,48,0.9)" }}
          >
            🍞 Eat food (Q)
          </button>
          <button
            onClick={onDrink}
            className="flex-1 py-2 rounded-lg text-xs font-medium"
            style={{ background: "rgba(68,170,255,0.12)", border: "1px solid rgba(68,170,255,0.25)", color: "rgba(68,170,255,0.9)" }}
          >
            💧 Drink water (R)
          </button>
        </div>

        <div className="overflow-y-auto px-3 py-3" style={{ maxHeight: 320 }}>
          {items.length === 0 ? (
            <div className="text-center py-8 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
              No items. Explore buildings and press F near loot.
            </div>
          ) : (
            items.map(([type, qty]) => {
              const meta = ITEM_META[type] ?? { icon: "📦", name: type, desc: "" };
              return (
                <div
                  key={type}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-lg mb-1"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span className="text-xl w-8 text-center">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>{meta.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{meta.desc}</div>
                  </div>
                  <div className="text-sm font-mono font-bold" style={{ color: "rgba(255,220,80,0.85)", minWidth: 28, textAlign: "right" }}>
                    ×{qty}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {player?.weapon && (
          <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>equipped weapon</div>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "rgba(255,220,80,0.07)", border: "1px solid rgba(255,220,80,0.2)" }}
            >
              <span className="text-base">🪓</span>
              <span className="text-xs font-medium" style={{ color: "rgba(255,220,80,0.9)" }}>{player.weapon}</span>
              <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Space to swing</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}