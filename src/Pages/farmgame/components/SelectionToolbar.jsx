import React, { useState, useMemo } from "react";

export default function SelectionToolbar({
  selectedTiles,
  onAction,
  onClear,
  seedCost = 0,
  showCost = false,
  expansionCost,
  game,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);

  const {
  dirtTilesToRemove,
  waterUpgradesPossible,
  hydroUpgradesPossible,
} = useMemo(() => {
  let dirt = 0;
  let water = 0;
  let hydro = 0;

  if (!selectedTiles?.length || !game?.grid) return { dirtTilesToRemove: 0, waterUpgradesPossible: 0, hydroUpgradesPossible: 0 };

  for (const { x, y } of selectedTiles) {
    const tile = game.grid?.[x]?.[y];

    if (!tile) continue;

    // 🌾 Count Dirt/Planted for Remove Dirt
    if (tile.type === "dirt" || tile.type === "planted") {
      dirt++;
    }

    // 💧 Count Empty Upgradable for Water/Hydro
    if (tile.type === "empty" && !tile.upgrade) {
      water++;

      if (game.seeds >= 2 && game.water >= 50) {
        hydro++;
      }
    }
  }

  return {
    dirtTilesToRemove: dirt,
    waterUpgradesPossible: water,
    hydroUpgradesPossible: hydro,
  };
}, [selectedTiles, game?.grid, game?.seeds, game?.water]);

  const removeDirtCost = dirtTilesToRemove * 1;
  const waterUpgradeCost = waterUpgradesPossible * 2;
  const hydroUpgradeCost = {
    seeds: hydroUpgradesPossible * 2,
    water: hydroUpgradesPossible * 50,
  };

  if (!selectedTiles?.length) return null;

  return (
    <div className="w-full border-t border-gray-300 px-4 py-2 bg-white shadow z-30">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold">
          Selected Tiles: {selectedTiles.length}
        </span>
        <button
          onClick={() => setCollapsed(prev => !prev)}
          className="text-sm text-gray-600 hover:text-black"
        >
          {collapsed ? "▼ Expand All" : "▲ Collapse All"}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Basic Actions */}
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              onClick={() => onAction("addDirt")}
              className="flex-1 py-1 px-2 bg-yellow-400 text-white rounded hover:bg-yellow-500 text-sm"
            >
              Add Dirt
            </button>

            <button
              onClick={() => onAction("plantSeed")}
              className="flex-1 py-1 px-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              Plant
            </button>

            <button
              onClick={() => onAction("harvest")}
              className="flex-1 py-1 px-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
            >
              Harvest
            </button>

            <button
              onClick={() => onAction("removeDirt")}
              className="flex-1 py-1 px-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Remove Dirt (-{removeDirtCost} Seeds)
            </button>
          </div>

          {/* Upgrades Toggle */}
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold">Upgrades - Place On Empty Tiles</span>
            <button
              onClick={() => setShowUpgrades(prev => !prev)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showUpgrades ? "▲ Hide Upgrades" : "▼ Show Upgrades"}
            </button>
          </div>

          {/* Upgrades Section */}
          {showUpgrades && (
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                onClick={() => onAction("upgradeWater")}
                className="flex-1 py-1 px-2 bg-blue-400 text-white rounded hover:bg-blue-500 text-sm"
              >
                💧 Water Upgrade (+2/sec, -{waterUpgradeCost} Seeds)
              </button>

              <button
                onClick={() => onAction("upgradeHydro")}
                className="flex-1 py-1 px-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
              >
                Hydroponics Half Time, No Bugs (-{hydroUpgradeCost.seeds} Seeds, -{hydroUpgradeCost.water} Water)
              </button>

              <button
                onClick={() => onAction("upgradeExpand")}
                className="flex-1 py-1 px-2 bg-green-700 text-white rounded hover:bg-green-800 text-sm"
              >
                🪴 Expand (-{expansionCost} Seeds)
              </button>
            </div>
          )}

          {/* Clear Selection */}
          <div className="flex justify-end">
            <button
              onClick={onClear}
              className="py-1 px-3 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
            >
              Clear Selection
            </button>
          </div>
        </>
      )}
    </div>
  );
}