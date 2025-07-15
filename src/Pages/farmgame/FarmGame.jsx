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
  const [modalTile, setModalTile] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      gameRef.current = tick(gameRef.current);
      forceUpdate((x) => x + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTileClick = (x, y) => {
    gameRef.current.selected = [x, y];
    const tile = gameRef.current.grid[x][y];

    if (
      tile.type === TILE_TYPES.PLANTED &&
      tile.growth >= (gameRef.current.hydroponics ? 10 : 20)
    ) {
      gameRef.current = performAction(gameRef.current, "harvest", x, y);
      forceUpdate((x) => x + 1);
      return;
    }

    setModalTile([x, y]);
  };

  const handleAction = (action) => {
    if (!modalTile) return;
    const [x, y] = modalTile;
    gameRef.current = performAction(gameRef.current, action, x, y);
    setModalTile(null);
    forceUpdate((x) => x + 1);
  };

  const game = gameRef.current;
  const [selX, selY] = game.selected || [];

  const renderAvailableActions = () => {
    const [x, y] = modalTile;
    const tile = game.grid[x][y];
    const actions = [];

    if (tile.type === TILE_TYPES.EMPTY && !tile.upgrade) {
  actions.push(
    <button
      onClick={() => handleAction("addDirt")}
      className="w-full px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded"
    >
      Add Dirt
    </button>
  );
}

if (tile.type === TILE_TYPES.EMPTY && !tile.upgrade) {
  actions.push(
    <button
      onClick={() => handleAction("upgradeWater")}
      className="w-full px-2 py-1 bg-blue-200 hover:bg-blue-300 rounded"
    >
      💦 +2 Water Gain (2 seeds)
    </button>,
    <button
      onClick={() => handleAction("upgradeHydro")}
      className="w-full px-2 py-1 bg-green-200 hover:bg-green-300 rounded"
    >
      🌿 Hydroponics (5 seeds)
    </button>,
    <button
      onClick={() => handleAction("upgradeExpand")}
      className="w-full px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
    >
      ➕ Expand Grid (Cost: {game.expansionCost} seeds)
    </button>
  );
}

    if (tile.type === TILE_TYPES.DIRT) {
      actions.push(
        <button
          onClick={() => handleAction("plantSeed")}
          className="w-full px-2 py-1 bg-green-200 hover:bg-green-300 rounded"
        >
          Plant Seed
        </button>,
        <button
          onClick={() => handleAction("removeDirt")}
          className="w-full px-2 py-1 bg-red-200 hover:bg-red-300 rounded"
        >
          Remove Dirt (−1 seed)
        </button>
      );
    }

    return actions;
  };

  return (
    <div className="p-4 max-w-sm mx-auto bg-white shadow rounded space-y-4 text-sm">
      <h2 className="text-xl font-bold text-center">💧 Water Garden</h2>

      <div className="flex justify-between text-sm">
        <span>💧 Water: {game.water}</span>
        <span>🌱 Seeds: {game.seeds}</span>
      </div>

      <p className="text-gray-600 text-center">
        Water Rate: 1 + {game.bonusWater} − {game.plantedCount} =
        <strong> {1 + game.bonusWater - game.plantedCount}</strong>/sec
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
                tile.growth >= (game.hydroponics ? 10 : 20) ? (
                  <span className="text-green-800 font-bold">Grown ✅</span>
                ) : (
                  <>
                    <span>Growth:</span>
                    <span>{tile.growth}s</span>
                  </>
                )
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

      {modalTile && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded p-4 shadow-lg space-y-2 max-w-xs w-full">
            <h3 className="text-sm font-bold mb-2">
              Actions for Tile [{modalTile[0]}, {modalTile[1]}]
            </h3>
            {renderAvailableActions()}
            <button
              onClick={() => setModalTile(null)}
              className="w-full px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
