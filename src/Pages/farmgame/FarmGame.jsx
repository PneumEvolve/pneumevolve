// src/Pages/farmgame/FarmGame.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  createGameState,
  performAction,
  tick,
  TILE_TYPES,
  UPGRADE_TYPES,
} from "./gameEngine";
import Tile from "./components/Tile";
import TileModal from "./components/TileModal";
import GameHeader from "./components/GameHeader";
import WaterRateDisplay from "./components/WaterRateDisplay";
import GameOverlay from "./components/GameOverlay";
import SelectionToolbar from "./components/SelectionToolbar";
import BugDisplay from "./components/BugDisplay";

function getAvailableActions(tile) {
  const actions = [];

  const isHydro = tile.upgrade === UPGRADE_TYPES.HYDRO;
  const isUnplantedHydro = isHydro && tile.type !== TILE_TYPES.PLANTED;
  
  const growTime = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
  const isHarvestable = tile.type === TILE_TYPES.PLANTED && tile.growth >= growTime;

  const isEmpty =
    (tile.type === "empty" || tile.type === null || tile.type === undefined) &&
    (!tile.upgrade || tile.upgrade === null) &&
    tile.growth === 0;

  const isDirt = tile.type === TILE_TYPES.DIRT;
  const isPlanted = tile.type === TILE_TYPES.PLANTED;
  const isUpgraded = !!tile.upgrade;

  // ✅ Always show upgrade options on empty tiles
  if (isEmpty) {
    actions.push("addDirt", "upgradeHydro", "upgradeExpand", "upgradeWater");
  }

  if (isUnplantedHydro) {
  actions.push("plant");
  }

  if (isDirt) {
    actions.push("plant");
    if (!isUpgraded) {
      actions.push("upgradeHydro", "upgradeExpand", "upgradeWater");
    }
    actions.push("addWater");
  }

  if (isPlanted) {
    if (!isUpgraded) {
      actions.push("upgradeHydro", "upgradeExpand", "upgradeWater");
    }
    if (
      tile.upgrade !== UPGRADE_TYPES.HYDRO &&
      tile.upgrade !== UPGRADE_TYPES.EXPAND
    ) {
      actions.push("addWater");
    }
  }

  if (isHarvestable) {
    actions.push("harvest");
  }

  if (
  tile.type === TILE_TYPES.DIRT ||
  (tile.type === TILE_TYPES.PLANTED && tile.growth === 0)
) {
  actions.push("removeDirt");
}

  return actions;
}

export default function FarmGame() {
  const [game, setGame] = useState({
  ...createGameState(),
  hasWon: false,
});
  const [forceRender, setForceRender] = useState(0);
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [modalTile, setModalTile] = useState(null);
  const gameRef = useRef(game);
  const dragging = useRef(false);
  const [startCoords, setStartCoords] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
  const interval = setInterval(() => {
    if (!gameRef.current.isPaused) {
      const updatedGame = tick({ ...gameRef.current });
      gameRef.current = updatedGame;
      setGame(updatedGame);
      setElapsedTime((prev) => prev + 1);
    }
  }, 1000);

  return () => clearInterval(interval);
}, []);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
  if (game.seeds >= 100 && !game.hasWon) {
    setGame(prev => ({
      ...prev,
      showWinModal: true,
      hasWon: true,
      winTime: elapsedTime,
      isPaused: true,
    }));
  }
}, [game.seeds, game.hasWon, elapsedTime]);

  const handleTileClick = (x, y, requestModal = false) => {
    if (game.isPaused) return;
  const tile = game.grid[x][y];
  const hasBug = game.bugs.some((b) => b.x === x && b.y === y);

  if (hasBug) {
  const updated = performAction(game, "squashBug", x, y);
  setGame(prev => ({
    ...updated,
    selectedTiles: prev.selectedTiles, // ✅ Preserve current selection
  }));
  return; // ✅ Exit early, don't open modal or change selection
}

  const growTime = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
  const isHarvestable = tile.type === TILE_TYPES.PLANTED && tile.growth >= growTime;

  if (isHarvestable) {
  const updated = performAction(game, "harvest", x, y);

  // ✅ Preserve the current selectedTiles explicitly
  setGame((prev) => ({
    ...updated,
    selectedTiles: [...selectedTiles], // Keep current selection
  }));

  return;
}

  if (requestModal) {
    const actions = getAvailableActions(tile);
    if (actions.length > 0) {
      setModalTile({ x, y });
    }
  }
};

  const handleAction = (action) => {
    if (!modalTile) return;
    const { x, y } = modalTile;
    const updated = performAction(game, action, x, y);
    setGame(updated);
    setModalTile(null);
  };

  const handleMouseDown = (x, y) => {
    if (game.isPaused) return;
  const tile = game.grid[x][y];

  // ❌ Prevent selecting if there's a bug
  const hasBug = game.bugs.some((b) => b.x === x && b.y === y);
  if (hasBug) return;

 

  // ✅ Begin drag and select starting tile
  dragging.current = true;
  setStartCoords({ x, y });
  setSelectedTiles([{ x, y }]);
};

  const handleMouseEnter = (x, y) => {
    if (dragging.current && startCoords) {
      const tiles = [];
      const minX = Math.min(startCoords.x, x);
      const maxX = Math.max(startCoords.x, x);
      const minY = Math.min(startCoords.y, y);
      const maxY = Math.max(startCoords.y, y);
      for (let i = minX; i <= maxX; i++) {
        for (let j = minY; j <= maxY; j++) {
          tiles.push({ x: i, y: j });
        }
      }
      setSelectedTiles(tiles);
    }
  };

  const handleMouseUp = () => {
    dragging.current = false;
  };

  const handleBulkAction = (action) => {
    if (game.isPaused) return;
    let updated = { ...game };
    for (const { x, y } of selectedTiles) {
      updated = performAction(updated, action, x, y);
    }
    setGame(updated);
  };

  const togglePause = () => {
  setGame(prev => ({
    ...prev,
    isPaused: !prev.isPaused,
  }));
};


  const isMobile = window.innerWidth < 640;
const tileSize = isMobile
  ? Math.floor(window.innerWidth / (game.gridSize + 2))  // e.g. ~40px for 5x5 grid
  : 48; // Desktop size (adjust as needed)

  return (
    
  <div className="min-h-screen w-full flex flex-col items-center justify-start bg-gray-100 p-4">
    <div className="max-w-4xl w-full flex flex-col space-y-4">
      {/* Header: Title + Stats */}
      <GameHeader
        game={game}
        elapsedTime={elapsedTime}
        onTogglePause={togglePause}
        isPaused={game.isPaused}
        onAddWater={() => {
  if (!game.isPaused) {
    setGame(prev => ({ ...prev, water: prev.water + 1 }));
  }
}}
        onSaveScore={() => {
  const previous = localStorage.getItem("farmgame_best");
  const currentScore = { time: elapsedTime, seeds: game.seeds };

  if (!previous) {
    localStorage.setItem("farmgame_best", JSON.stringify(currentScore));
  } else {
    const best = JSON.parse(previous);
    if (elapsedTime < best.time) {
      localStorage.setItem("farmgame_best", JSON.stringify(currentScore));
    }
  }

  setGame(prev => ({
    ...prev,
    showWinModal: false,
    isPaused: false, // ✅ Resume game after saving
  }));
}}
        onCloseWinModal={() => setGame({ ...game, showWinModal: false })}
      />


      {/* Grid + Toolbar (always together and centered) */}
<div className="w-full flex flex-col items-center space-y-2">
  <div
    className={`grid gap-1 justify-center ${game.isPaused ? 'pointer-events-none opacity-50' : ''}`}
    style={{
      gridTemplateColumns: `repeat(${game.gridSize}, ${tileSize}px)`,
      width: `${game.gridSize * tileSize}px`,
    }}
  >
    {game.grid.map((row, x) =>
      row.map((tile, y) => (
        <Tile
          key={`${x}-${y}`}
          i={x}
          j={y}
          tile={tile}
          isSelected={selectedTiles.some(t => t.x === x && t.y === y)}
          hasBug={game.bugs.some(b => b.x === x && b.y === y)}
          onClick={() => handleTileClick(x, y, true)}
          onStartDrag={handleMouseDown}
          onDuringDrag={handleMouseEnter}
          onEndDrag={handleMouseUp}
          tileSize={tileSize}
        />
      ))
    )}
  </div>

  {/* Attach toolbar below grid */}
  {selectedTiles.length > 0 && (
    <div className={`w-full max-w-[300px] ${game.isPaused ? 'pointer-events-none opacity-50' : ''}`}>
      <SelectionToolbar
        selectedTiles={selectedTiles}
        onAction={handleBulkAction}
        onClear={() => setSelectedTiles([])}
        game={game}
        expansionCost={game.expansionCost}
      />
    </div>
  )}
</div>

      {modalTile && (
  <TileModal
    i={modalTile.x}
    j={modalTile.y}
    game={game}
    tile={game.grid[modalTile.x][modalTile.y]}
    actions={getAvailableActions(game.grid[modalTile.x][modalTile.y])}
    onAction={(action, i, j) => {
      const updated = performAction(game, action, i, j);
      setGame(updated);
      setModalTile(null);
    }}
    onClose={() => setModalTile(null)}
    expansionCost={game.expansionCost}
  />
)}

      
      
      {game.isPaused && (
  <div className="fixed inset-0 z-40 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white text-center px-4">
    <h2 className="text-3xl font-bold mb-4">Game Paused</h2>
    
    <button
      onClick={togglePause}
      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded text-lg shadow mb-3"
    >
      Resume
    </button>

    <button
      onClick={() => {
        localStorage.removeItem("farmgame_save");
        window.location.reload(); // 🔄 Full reset
      }}
      className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded text-sm mb-2"
    >
      🔄 Reset Game
    </button>

    <button
      onClick={() => {
        localStorage.removeItem("farmgame_best");
        alert("Best score reset.");
      }}
      className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2 rounded text-sm"
    >
      🧹 Reset High Score
    </button>
  </div>
)}
    </div>
  </div>
);
}
