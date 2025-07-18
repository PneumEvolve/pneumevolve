import React, { useEffect, useState } from "react";

export default function TileModal({
  i,
  j,
  tile,
  game,
  actions,
  onAction,
  onClose,
  expansionCost,
}) {
  const [showUpgrades, setShowUpgrades] = useState(() => {
  const saved = localStorage.getItem("tilemodal_showUpgrades");
  return saved === null ? true : saved === "true";
});

useEffect(() => {
  localStorage.setItem("tilemodal_showUpgrades", showUpgrades.toString());
}, [showUpgrades]);

  // Load saved toggle from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("tilemodal_showUpgrades");
    if (stored !== null) {
      setShowUpgrades(stored === "true");
    }
  }, []);

  // Save toggle to localStorage on change
  useEffect(() => {
    localStorage.setItem("tilemodal_showUpgrades", showUpgrades.toString());
  }, [showUpgrades]);

  const has = (action) => actions.includes(action);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-sm p-4 space-y-3 relative sm:w-[400px]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold"
        >
          &times;
        </button>

        {/* Modal Header */}
        <h2 className="text-lg font-semibold text-center">
          Tile Options [{i}, {j}]
        </h2>

        {/* Basic Actions */}
        <div className="flex flex-wrap gap-2">
          {has("addDirt") && (
            <button
              onClick={() => onAction("addDirt", i, j)}
              className="flex-1 py-1 px-2 bg-yellow-400 text-white rounded hover:bg-yellow-500 text-sm"
            >
              Add Dirt
            </button>
          )}
          {has("plant") && (
            <button
              onClick={() => onAction("plant", i, j)}
              className="flex-1 py-1 px-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              Plant
            </button>
          )}
          {has("harvest") && (
            <button
              onClick={() => onAction("harvest", i, j)}
              className="flex-1 py-1 px-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
            >
              Harvest
            </button>
          )}
          {has("removeDirt") && (
            <button
              onClick={() => onAction("removeDirt", i, j)}
              className="flex-1 py-1 px-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Remove Dirt (-1 Seed)
            </button>
          )}
        </div>

        {/* Upgrades Toggle */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-semibold">Upgrades - Place On Empty Tiles</span>
          <button
            onClick={() => setShowUpgrades((prev) => !prev)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showUpgrades ? "▲ Hide Upgrades" : "▼ Show Upgrades"}
          </button>
        </div>

        {/* Upgrades Section */}
{showUpgrades && (
  <div className="space-y-2">
    {/* Player Resources Display */}
    <div className="text-sm text-center text-gray-700">
      You have <span className="font-bold">{game?.seeds ?? 0}</span> Seeds and <span className="font-bold">{game?.water ?? 0}</span> Water
    </div>

    {/* Upgrade Buttons */}
    <div className="flex flex-wrap gap-2">
      {has("upgradeWater") && (
        <button
          onClick={() => onAction("upgradeWater", i, j)}
          className="flex-1 py-1 px-2 bg-blue-400 text-white rounded hover:bg-blue-500 text-sm"
        >
          💧 Water Upgrade (+2/sec, -2 Seeds)
        </button>
      )}
      {has("upgradeHydro") && (
        <button
          onClick={() => onAction("upgradeHydro", i, j)}
          className="flex-1 py-1 px-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
        >
          ⚗️ Hydroponics (-2 Seeds, -50 Water)
        </button>
      )}
      {has("upgradeExpand") && (
        <button
          onClick={() => onAction("upgradeExpand", i, j)}
          className="flex-1 py-1 px-2 bg-green-700 text-white rounded hover:bg-green-800 text-sm"
        >
          🪴 Expand Grid (-{expansionCost} Seeds)
        </button>
      )}
    </div>
  </div>
)}
      </div>
    </div>
  );
}