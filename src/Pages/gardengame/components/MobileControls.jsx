// src/Pages/gardengame/components/MobileControls.jsx
import React from "react";

export default function MobileControls({ onMove, onShoot, onPlant, onToggleSeed }) {
  return (
    <div className="fixed bottom-4 left-0 right-0 flex flex-col items-center z-50">
      <div className="flex gap-4 mb-2">
        <button className="px-4 py-2 bg-gray-800 text-white rounded text-xl" onClick={() => onMove(0, -1)}>⬆️</button>
      </div>
      <div className="flex gap-4 mb-2">
        <button className="px-4 py-2 bg-gray-800 text-white rounded text-xl" onClick={() => onMove(-1, 0)}>⬅️</button>
        <button className="px-4 py-2 bg-gray-800 text-white rounded text-xl" onClick={() => onMove(1, 0)}>➡️</button>
      </div>
      <div className="flex gap-4 mb-2">
        <button className="px-4 py-2 bg-gray-800 text-white rounded text-xl" onClick={() => onMove(0, 1)}>⬇️</button>
      </div>
      <div className="flex gap-4">
        <button className="px-4 py-2 bg-gray-800 text-white rounded text-xl" onClick={onPlant}>🌱 Plant</button>
        <button className="px-4 py-2 bg-gray-800 text-white rounded text-xl" onClick={onShoot}>🔫 Shoot</button>
        <button className="px-4 py-2 bg-gray-800 text-white rounded text-xl" onClick={() => onToggleSeed(-1)}>🔄 Prev Seed</button>
        <button className="px-4 py-2 bg-gray-800 text-white rounded text-xl" onClick={() => onToggleSeed(1)}>🔄 Next Seed</button>
      </div>
    </div>
  );
}