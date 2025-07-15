// FarmGame.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  createGameState,
  tick,
  performAction,
  TILE_TYPES,
  UPGRADE_TYPES,
} from "./gameEngine";

export default function FarmGame() {
  const [_, forceUpdate] = useState(0);
  const gameRef = useRef(createGameState());
  const [modalTile, setModalTile] = useState(null);
  const [selectedArea, setSelectedArea] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerActive, setTimerActive] = useState(true);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winTime, setWinTime] = useState(null);
  const [hasWon, setHasWon] = useState(false);
  const [highScore, setHighScore] = useState(() => {
  const saved = localStorage.getItem("farmgame_best");
  return saved ? JSON.parse(saved).time : null;
});

  useEffect(() => {
  const preventDefault = (e) => e.preventDefault();
  document.addEventListener("touchmove", preventDefault, { passive: false });

  return () => {
    document.removeEventListener("touchmove", preventDefault);
  };
}, []);

  useEffect(() => {
  const escHandler = (e) => {
    if (e.key === "Escape") setModalTile(null);
  };
  window.addEventListener("keydown", escHandler);
  return () => window.removeEventListener("keydown", escHandler);
}, []);

  useEffect(() => {
  const interval = setInterval(() => {
    gameRef.current = tick(gameRef.current);
    forceUpdate((x) => x + 1);

    if (!hasWon && gameRef.current.seeds >= 25) {
  setShowWinModal(true);
  setTimerActive(false);
  setHasWon(true); // ✅ mark as won
}
  }, 1000);

  return () => clearInterval(interval);
}, [showWinModal]);

  useEffect(() => {
  if (!timerActive) return;
  const timer = setInterval(() => {
    setElapsedTime((t) => t + 1);
  }, 1000);
  return () => clearInterval(timer);
}, [timerActive]);

  const handleWinSave = () => {
  const seedCount = gameRef.current.seeds;
  const time = elapsedTime;

  const storedBest = localStorage.getItem("farmgame_best");
  let best = storedBest ? JSON.parse(storedBest) : null;

  if (
    !best ||
    time < best.time ||
    (time === best.time && seedCount < best.seeds)
  ) {
    best = { time, seeds: seedCount };
    localStorage.setItem("farmgame_best", JSON.stringify(best));
    setHighScore(time);
  }

  setShowWinModal(false);
  setTimerActive(true);
};

  const handleTileClick = (x, y) => {
    if (selectedArea.length > 0) return;

    gameRef.current.selected = [x, y];
    const tile = gameRef.current.grid[x][y];

    if (
      tile.type === TILE_TYPES.PLANTED &&
      tile.growth >= (tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20)
    ) {
      gameRef.current = performAction(gameRef.current, "harvest", x, y);
      forceUpdate((x) => x + 1);
      return;
    }

    setModalTile([x, y]);
  };

  const handleWin = () => {
  setTimerActive(false);
  setWinTime(elapsedTime);

  if (!highScore || elapsedTime < highScore) {
    localStorage.setItem("farmgame_highscore", elapsedTime.toString());
    setHighScore(elapsedTime);
  }
};

  const handleAction = (action) => {
    if (!modalTile) return;
    const [x, y] = modalTile;
    gameRef.current = performAction(gameRef.current, action, x, y);
    setModalTile(null);
    forceUpdate((x) => x + 1);
  };

  const handleGroupAction = (action) => {
  if (selectedArea.length === 0) return;
  selectedArea.forEach(([x, y]) => {
    gameRef.current = performAction(gameRef.current, action, x, y);
  });
  forceUpdate((x) => x + 1);
};

  const startDrag = (i, j) => {
    setIsDragging(true);
    setDragStart([i, j]);
    setSelectedArea([]);
  };

  const duringDrag = (i, j) => {
    if (!isDragging || !dragStart) return;
    const [startX, startY] = dragStart;
    const newSelected = [];

    for (let x = Math.min(startX, i); x <= Math.max(startX, i); x++) {
      for (let y = Math.min(startY, j); y <= Math.max(startY, j); y++) {
        newSelected.push([x, y]);
      }
    }
    setSelectedArea(newSelected);
  };

  const endDrag = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const game = gameRef.current;

  const renderAvailableActions = () => {
  if (!modalTile) return null;

  const [x, y] = modalTile;
  const tile = game.grid?.[x]?.[y];
  if (!tile) return <p className="text-gray-500">Invalid tile.</p>;

  const actions = [];

  if (tile.type === TILE_TYPES.EMPTY && !tile.upgrade) {
    actions.push(
      <button onClick={() => handleAction("addDirt")} className="w-full px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded">
        Add Dirt
      </button>,
      <button onClick={() => handleAction("upgradeWater")} className="w-full px-2 py-1 bg-blue-200 hover:bg-blue-300 rounded">
        💦 +2 Water Gain (2 seeds)
      </button>,
      <button onClick={() => handleAction("upgradeHydro")} className="w-full px-2 py-1 bg-green-200 hover:bg-green-300 rounded">
        🌿 Hydroponics - Half Grow Time, -2 Water (3 seeds, 50 water)
      </button>,
      <button onClick={() => handleAction("upgradeExpand")} className="w-full px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded">
        ➕ Expand Grid (Cost: {game.expansionCost} seeds)
      </button>
    );
  }

  if ((tile.type === TILE_TYPES.DIRT || tile.upgrade === UPGRADE_TYPES.HYDRO) && tile.type !== TILE_TYPES.PLANTED) {
    actions.push(
      <button onClick={() => handleAction("plantSeed")} className="w-full px-2 py-1 bg-green-200 hover:bg-green-300 rounded">
        Plant Seed
      </button>
    );
  }

  if (tile.type === TILE_TYPES.DIRT) {
    actions.push(
      <button onClick={() => handleAction("removeDirt")} className="w-full px-2 py-1 bg-red-200 hover:bg-red-300 rounded">
        Remove Dirt (−1 seed)
      </button>
    );
  }

  if (game.seeds >= 25 && timerActive) {
  actions.push(
    <button
      onClick={handleWin}
      className="w-full px-2 py-1 bg-purple-300 hover:bg-purple-400 rounded font-bold"
    >
      🎉 Win the Game (25 seeds)
    </button>
  );
}

  return actions.length > 0 ? actions : <p className="text-gray-500 italic">No actions available for this tile.</p>;
};

  const anyHarvestable = selectedArea.some(([x, y]) => {
    const tile = game.grid[x][y];
    const isHydro = tile.upgrade === UPGRADE_TYPES.HYDRO;
     const growthTime = isHydro ? 10 : 20;
    return tile.type === TILE_TYPES.PLANTED && tile.growth >= growthTime;
        });

  return (
    <div className="p-4 max-w-sm mx-auto bg-white shadow rounded space-y-4 text-sm">
      <h2 className="text-xl font-bold text-center">💧 Water Garden</h2>
        <div className="text-center text-sm">
  <p>⏱️ Time: {elapsedTime}s</p>
  {highScore && (
    <p>
      🏆 Best Time: {JSON.parse(localStorage.getItem("farmgame_best")).time}s
      ({JSON.parse(localStorage.getItem("farmgame_best")).seeds} seeds)
    </p>
  )}
  {winTime && <p className="font-bold text-green-600">🎉 You Win! Time: {winTime}s</p>}
</div>
      <div className="flex justify-between text-sm">
        <span>💧 Water: {game.water}</span>
        <span>🌱 Seeds (25 to Win!): {game.seeds}</span>
      </div>

      <p className="text-gray-600 text-center">
  Water Rate: 1 + {game.bonusWater} − ({game.plantedCount - game.hydroCount} × 1) − ({game.hydroCount} × 3) =
  <strong> {1 + game.bonusWater - (game.plantedCount - game.hydroCount) - game.hydroCount * 3}</strong>/sec
</p>

      <button
  onClick={() => {
    game.water++;
    forceUpdate((x) => x + 1);
  }}
  className="w-full py-2 px-4 bg-blue-500 text-white font-bold rounded hover:bg-blue-600"
  style={{ touchAction: "manipulation" }}
>
  +1 Gather Water
</button>

      <div
        className="grid gap-2 select-none"
        style={{ gridTemplateColumns: `repeat(${game.gridSize}, minmax(0, 1fr))` }}
      >
        {game.grid.map((row, i) =>
          row.map((tile, j) => {
            const isSelected = selectedArea.some(([x, y]) => x === i && y === j);
            return (
              <div
  key={`${i}-${j}`}
  onMouseDown={() => startDrag(i, j)}
  onMouseEnter={() => duringDrag(i, j)}
  onMouseUp={endDrag}
  onTouchStart={() => startDrag(i, j)}
  onTouchMove={(e) => {
    const target = document.elementFromPoint(
      e.touches[0].clientX,
      e.touches[0].clientY
    );
    if (target?.dataset?.tile) {
      const [x, y] = target.dataset.tile.split(",").map(Number);
      duringDrag(x, y);
    }
  }}
  onTouchEnd={endDrag}
  onClick={() => handleTileClick(i, j)}
  data-tile={`${i},${j}`} // 👈 makes it trackable for touch
                className={`border h-20 flex flex-col items-center justify-center text-xs cursor-pointer rounded ${
                  isSelected ? "ring-2 ring-indigo-500" : ""
                } ${
                  tile.type === TILE_TYPES.EMPTY
                    ? "bg-gray-100"
                    : tile.type === TILE_TYPES.DIRT
                    ? "bg-yellow-300"
                    : "bg-green-300"
                }`}
              >
                {tile.expansionUsed ? null : tile.type === TILE_TYPES.PLANTED ? (
  tile.growth >= (tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20) ? (
    <span className="text-green-800 font-bold">Grown ✅</span>
  ) : (
    <>
      <span>{tile.upgrade === UPGRADE_TYPES.HYDRO ? "🌿 Hydro Growing" : "Growth:"}</span>
      <span>{tile.growth}s</span>
    </>
  )
) : tile.upgrade === UPGRADE_TYPES.WATER ? (
  "💦 +2 Water"
) : tile.upgrade === UPGRADE_TYPES.HYDRO ? (
  "🌿 Hydro"
) : (
  tile.type
)}
                {tile.expansionUsed && (
                  <span className="text-[10px] text-gray-700 font-semibold mt-1">
                    EXPANSION USED
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
        {selectedArea.length === 0 && (
  <p className="text-center text-gray-400 text-xs italic mt-2">
    💡 Tip: Click and drag to select multiple tiles
  </p>
)}


      {selectedArea.length > 0 && (
  <div className="space-y-2 mt-4">
    <p className="text-center font-semibold">Group Actions</p>
    <div className="flex flex-wrap gap-2 justify-center">
      <button onClick={() => handleGroupAction("plantSeed")} className="px-2 py-1 bg-green-200 hover:bg-green-300 rounded">
        Plant Seeds
      </button>

      {anyHarvestable && (
        <button onClick={() => handleGroupAction("harvest")} className="px-2 py-1 bg-green-300 hover:bg-green-400 rounded">
          Harvest Grown
        </button>
      )}

      <button onClick={() => handleGroupAction("addDirt")} className="px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded">
        Add Dirt
      </button>

      <button onClick={() => handleGroupAction("upgradeHydro")} className="px-2 py-1 bg-green-100 hover:bg-green-200 rounded">
        Add Hydroponics
      </button>

      {(() => {
        const dirtTiles = selectedArea.filter(([x, y]) => {
          const tile = game.grid[x][y];
          return (tile.type === "dirt" || tile.type === "planted");
        });
        const totalCost = dirtTiles.length;

        return dirtTiles.length > 0 ? (
          <button
            onClick={() => handleGroupAction("removeDirt")}
            className="px-2 py-1 bg-red-100 hover:bg-red-200 rounded"
          >
            Remove Dirt (Cost: {totalCost} seeds)
          </button>
        ) : null;
      })()}

      <button onClick={() => setSelectedArea([])} className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded">
        Clear Selection
      </button>
    </div>
  </div>
)}

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
{showWinModal && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
    <div className="bg-white rounded p-6 shadow-xl w-full max-w-sm space-y-4">
      <h2 className="text-xl font-bold text-center text-green-600">🎉 You Win!</h2>
      <p className="text-center">Time: {elapsedTime}s</p>
      <p className="text-center">Seeds: {gameRef.current.seeds}</p>
      <div className="flex flex-col gap-2">
        <button
          onClick={handleWinSave}
          className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-bold"
        >
          Save Score & Keep Playing
        </button>
        <button
          onClick={() => setShowWinModal(false)}
          className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}