// src/pages/FarmGame.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  createGameState,
  tick,
  performAction,
  TILE_TYPES,
  UPGRADE_TYPES,
  GRID_SIZE,
} from "./gameEngine";

export default function FarmGame() {
  const [_, forceUpdate] = useState(0);
  const gameRef = useRef(createGameState());

  // Game loop tick every second
  useEffect(() => {
  const interval = setInterval(() => {
    gameRef.current = tick(gameRef.current); // ✅ Save the returned state
    forceUpdate((x) => x + 1); // Re-render
  }, 1000);
  return () => clearInterval(interval);
}, []);

  const handleTileClick = (x, y) => {
    gameRef.current.selected = [x, y];
    forceUpdate((x) => x + 1);
  };

  const handleAction = (action) => {
  const { selected } = gameRef.current;
  if (!selected) return;
  const [x, y] = selected;
  gameRef.current = performAction(gameRef.current, action, x, y); // ✅ update the state
  forceUpdate((x) => x + 1); // re-render
};

  const game = gameRef.current;
  const [selX, selY] = game.selected || [];

  return (
    <div className="p-4 max-w-sm mx-auto bg-white shadow rounded space-y-4 text-sm">
      <h2 className="text-xl font-bold text-center">💧 Water Garden</h2>

      <div className="flex justify-between text-sm">
        <span>💧 Water: {game.water}</span>
        <span>🌱 Seeds: {game.seeds}</span>
      </div>

      <p className="text-gray-600 text-center">
  Water Rate: 1 + {game.bonusWater} − {game.plantedCount} ={" "}
  <strong>{1 + game.bonusWater - game.plantedCount}</strong>/sec
</p>

      <button
        onClick={() => {
          game.water++;
          forceUpdate((x) => x + 1);
        }}
        className="w-full py-2 px-4 bg-blue-500 text-white font-bold rounded hover:bg-blue-600"
      >
        +1 Gather Water
      </button>

      <div
  className="grid gap-2"
  style={{ gridTemplateColumns: `repeat(${game.gridSize}, minmax(0, 1fr))` }}
>
        {game.grid.map((row, i) =>
          row.map((tile, j) => (
            <div
              key={`${i}-${j}`}
              onClick={() => handleTileClick(i, j)}
              className={`border h-20 flex flex-col items-center justify-center text-xs cursor-pointer rounded ${
                tile.type === TILE_TYPES.EMPTY
                  ? "bg-gray-100"
                  : tile.type === TILE_TYPES.DIRT
                  ? "bg-yellow-300"
                  : "bg-green-300"
              }`}
            >
              {tile.type === TILE_TYPES.PLANTED ? (
                <>
                  <span>Growth:</span>
                  <span>{tile.growth}s</span>
                </>
              ) : tile.upgrade === UPGRADE_TYPES.WATER ? (
                "💦 +2 Water"
              ) : tile.upgrade === UPGRADE_TYPES.HYDROPONICS ? (
                "🌿 Hydro"
              ) : (
                tile.type
              )}
            </div>
          ))
        )}
      </div>

      {game.selected && (
        <div className="mt-4 p-2 border rounded bg-gray-50 space-y-2">
          <h3 className="font-semibold text-sm">
            Inspecting Tile [{selX}, {selY}]
          </h3>
          <div className="space-y-1 text-sm">
            <button
              onClick={() => handleAction("addDirt")}
              className="block w-full px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded"
            >
              Add Dirt
            </button>
            <button
              onClick={() => handleAction("plantSeed")}
              className="block w-full px-2 py-1 bg-green-200 hover:bg-green-300 rounded"
            >
              Plant Seed
            </button>
            <button
              onClick={() => handleAction("harvest")}
              className="block w-full px-2 py-1 bg-purple-200 hover:bg-purple-300 rounded"
            >
              Harvest
            </button>
            <button
              onClick={() => handleAction("removeDirt")}
              className="block w-full px-2 py-1 bg-red-200 hover:bg-red-300 rounded"
            >
              Remove Dirt (−1 seed)
            </button>
          </div>

          {game.grid[selX][selY].type === TILE_TYPES.EMPTY &&
            !game.grid[selX][selY].upgrade && (
              <div className="space-y-1 pt-2 border-t text-sm">
                <h4 className="font-semibold">Upgrades</h4>
                <button
                  onClick={() => handleAction("upgradeWater")}
                  className="block w-full px-2 py-1 bg-blue-200 hover:bg-blue-300 rounded"
                >
                  💦 +2 Water Gain (2 seeds)
                </button>
                <button
                  onClick={() => handleAction("upgradeHydro")}
                  className="block w-full px-2 py-1 bg-green-200 hover:bg-green-300 rounded"
                >
                  🌿 Hydroponics: Half Grow Time (5 seeds)
                </button>
                <button
  onClick={() => handleAction("upgradeExpand")}
  className="block w-full px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
>
  ➕ Expand Grid (Cost: {game.expansionCost} seeds)
</button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}