// src/Pages/farmgame/FarmGame.jsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
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
import SelectionToolbar from "./components/SelectionToolbar";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button.jsx"


function getSavedGameFromLocalStorage() {
  const saved = localStorage.getItem("farmgame_save");
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);

    // ✅ Validate basic structure
    if (
      typeof parsed !== "object" ||
      !Array.isArray(parsed.grid) ||
      typeof parsed.elapsedTime !== "number"
    ) {
      throw new Error("Invalid saved game structure.");
    }

    return parsed;
  } catch (e) {
    console.warn("⚠️ Corrupt save detected, clearing localStorage:", e);
    localStorage.removeItem("farmgame_save");
    return null;
  }
}

function getAvailableActions(tile) {
  const actions = [];
  const isHydro = tile.upgrade === UPGRADE_TYPES.HYDRO;
  const isUnplantedHydro = isHydro && tile.type !== TILE_TYPES.PLANTED;
  const growTime = isHydro ? 10 : 20;
  const isHarvestable = tile.type === TILE_TYPES.PLANTED && tile.growth >= growTime;

  const isEmpty =
    (tile.type === "empty" || tile.type === null || tile.type === undefined) &&
    (!tile.upgrade || tile.upgrade === null) &&
    tile.growth === 0;

  const isDirt = tile.type === TILE_TYPES.DIRT;
  const isPlanted = tile.type === TILE_TYPES.PLANTED;
  const isUpgraded = !!tile.upgrade;

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
  const { accessToken, userId } = useAuth();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [game, setGame] = useState(null);
  const [farmer, setFarmer] = useState(null); // { endTime: Date }
  const farmerIntervalRef = useRef(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  console.log("Current game state", game);
  const [loaded, setLoaded] = useState(false);

  const [selectedTiles, setSelectedTiles] = useState([]);
  const [modalTile, setModalTile] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const dragging = useRef(false);
  const gameRef = useRef(null);

  const [hasSeenDirtWarning, setHasSeenDirtWarning] = useState(
  () => localStorage.getItem("seen_dirt_warning") === "true"
  );
  const [hasSeenHydroInfo, setHasSeenHydroInfo] = useState(
  () => localStorage.getItem("seen_hydro_info") === "true"
  );

const [notification, setNotification] = useState("");
const lastWaterUsedRef = useRef(0);

const showWarning = (message) => {
  setNotification(message);
};


  useEffect(() => {
   
  const simulateOfflineProgress = (saved) => {
    if (!Array.isArray(saved.grid)) {
  console.warn("Invalid grid detected during offline simulation");
  return createGameState();
}
    
    const now = Date.now();
    const savedTime = saved.lastSavedTime || now;
    const secondsPassed = Math.floor((now - savedTime) / 1000);

    let simulated = { ...saved };
    for (let i = 0; i < secondsPassed; i++) {
      simulated = tick(simulated);
    }

    simulated.elapsedTime = (saved.elapsedTime || 0) + secondsPassed;
    simulated.farmer = saved.farmer;
    return simulated;
  };

  const loadGame = async () => {
    if (accessToken && userId) {
      try {
        const res = await api.get(`/farmgame/state`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (res.data?.data) {
          let saved;
try {
  saved = JSON.parse(res.data.data);

  if (
    typeof saved !== "object" ||
    !Array.isArray(saved.grid) ||
    typeof saved.elapsedTime !== "number"
  ) {
    throw new Error("Invalid structure from Supabase");
  }
} catch (err) {
  console.warn("⚠️ Corrupt cloud save, using fresh state:", err);
  saved = null;
}
          const simulated = simulateOfflineProgress(saved);
          setGame(simulated);
          setElapsedTime(simulated.elapsedTime);
          gameRef.current = simulated;
          if (simulated.farmer?.endTime && simulated.farmer.endTime > Date.now()) {
  setFarmer(simulated.farmer);
}
        } else {
          const local = getSavedGameFromLocalStorage();
          if (local) {
            const simulated = simulateOfflineProgress(local);
            setGame(simulated);
            setElapsedTime(simulated.elapsedTime);
            gameRef.current = simulated;
          } else {
            const fresh = createGameState();
            setGame(fresh);
            gameRef.current = fresh;
          }
        }
      } catch (err) {
        console.error("Error loading saved game:", err);
        const local = getSavedGameFromLocalStorage();
        if (local) {
          const simulated = simulateOfflineProgress(local);
          setGame(simulated);
          setElapsedTime(simulated.elapsedTime);
          gameRef.current = simulated;
        } else {
          const fresh = createGameState();
          setGame(fresh);
          gameRef.current = fresh;
        }
      }
    } else {
      const local = getSavedGameFromLocalStorage();
      if (local) {
        const simulated = simulateOfflineProgress(local);
        setGame(simulated);
        setElapsedTime(simulated.elapsedTime);
        gameRef.current = simulated;
      } else {
        const fresh = createGameState();
        setGame(fresh);
        gameRef.current = fresh;
      }
    }

    setLoaded(true);
  };

  loadGame();
}, [accessToken, userId]);

  useEffect(() => {
  const interval = setInterval(() => {
    if (!gameRef.current || gameRef.current.isPaused) return;

    let updatedGame = tick({ ...gameRef.current });

    // ✅ Water logic
    if (!isNaN(updatedGame.waterUsed)) {
      lastWaterUsedRef.current = updatedGame.waterUsed;
    } else {
      updatedGame.waterUsed = lastWaterUsedRef.current;
    }

    // ✅ Farmer logic (one action per second)
    if (farmer) {
  let { x, y } = farmer;
  const gridSize = updatedGame.grid.length;

  for (let step = 0; step < gridSize * gridSize; step++) {
    const tile = updatedGame.grid[x][y];
    const growLimit = tile.upgrade === "hydro" ? 10 : 20;

    if (
      tile.type === "planted" &&
      tile.growth >= growLimit &&
      !tile.justGrown
    ) {
      updatedGame = performAction(updatedGame, "harvest", x, y);
      updatedGame = performAction(updatedGame, "plantSeed", x, y);

      // 👇 Save farmer's next position
      const nextX = (x + ((y + 1) >= gridSize ? 1 : 0)) % gridSize;
      const nextY = (y + 1) % gridSize;
      setFarmer({ ...farmer, x: nextX, y: nextY });
      break;
    }

    // ⏩ Move to next tile in grid
    y++;
    if (y >= gridSize) {
      y = 0;
      x++;
      if (x >= gridSize) x = 0;
    }
  }

  // ⌛ End farmer if time's up
  if (farmer.endTime <= Date.now()) {
    setFarmer(null);
  }
}

    gameRef.current = updatedGame;
    setGame(updatedGame);
    setElapsedTime((prev) => prev + 1);
  }, 1000);

  return () => clearInterval(interval);
}, [farmer]);

  useEffect(() => {
    if (game) gameRef.current = game;
  }, [game]);

  useEffect(() => {
    if (!game) return;
    localStorage.setItem("farmgame_save", JSON.stringify({ ...game, elapsedTime, lastSavedTime: Date.now(), farmer }));
  }, [game, elapsedTime]);

  useEffect(() => {
    if (!game) return;
    if (game.seeds >= 100 && !game.hasWon) {
      setGame(prev => ({
        ...prev,
        showWinModal: true,
        hasWon: true,
        winTime: elapsedTime,
        isPaused: true,
        showHireHelp: true,
      }));
    }
  }, [game, elapsedTime]);

  useEffect(() => {
    if (!accessToken || !userId || !game) return;

    const saveGame = async () => {
      try {
        await api.post(
          `/farmgame/state`,
          { data: JSON.stringify({ ...game, elapsedTime, farmer }) },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      } catch (err) {
        console.error("Error saving game:", err);
      }
    };

    saveGame();
  }, [game, elapsedTime, accessToken, userId]);

  

useEffect(() => {
  if (!farmer) return;

  const interval = setInterval(() => {
    const remaining = farmer.endTime - Date.now();
    if (remaining <= 0) {
      setTimeRemaining("00:00");
    } else {
      const mins = String(Math.floor(remaining / 60000)).padStart(2, "0");
      const secs = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
      setTimeRemaining(`${mins}:${secs}`);
    }
  }, 1000);

  return () => clearInterval(interval);
}, [farmer]);

function handleHireFarmer() {
  if (game.food < 900 || farmer) return;

  const endTime = Date.now() + 15 * 60 * 1000; // 15 minutes from now
  setGame(prev => ({ ...prev, food: prev.food - 900 }));
  setFarmer({ endTime, x: 0, y: 0 });
}


  const handleTileClick = (x, y, requestModal = false) => {
  if (game.isPaused) return;
  const tile = game.grid[x][y];
  const hasBug = game.bugs.some((b) => b.x === x && b.y === y);

  const hydroInfoCallback = () => {
    if (!hasSeenHydroInfo) {
      setHasSeenHydroInfo(true);
      localStorage.setItem("seen_hydro_info", "true");
      showWarning("🌊 Plant Seeds in Hydro Tiles.\n⏱️ Half grow time.\n🐞 No bugs.\n💧 -3 Water/sec while growing");
    }
  };

  if (hasBug) {
    const updated = performAction(game, "squashBug", x, y, showWarning, hydroInfoCallback);
    setGame(updated);
    return;
  }

  const growTime = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
  const isHarvestable = tile.type === TILE_TYPES.PLANTED && tile.growth >= growTime;

  if (isHarvestable) {
    const updated = performAction(game, "harvest", x, y, showWarning, hydroInfoCallback);
    setGame(updated);
    return; // ✅ skip modal entirely
  }

  if (requestModal) {
    const actions = getAvailableActions(tile);
    if (actions.length > 0) setModalTile({ x, y });
  }
};

  const handleAction = (action) => {
    if (!modalTile) return;
    const { x, y } = modalTile;
    const updated = performAction(game, action, x, y, showWarning, () => {
  showWarning("🌊 Plant Seeds in Hydro Tiles.\n⏱️ Half grow time.\n🐞 No bugs.\n💧 -3 Water/sec while growing");
});
    setGame(updated);
    setModalTile(null);
  };

  const handleMouseDown = (x, y) => {
  if (game.isPaused) return;

  const tile = game.grid[x][y];
  const growTime = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
  const isHarvestable =
    tile.type === TILE_TYPES.PLANTED && tile.growth >= growTime;

  // 🛑 Don't start new selection on harvestable tile
  if (isHarvestable) return;

  if (game.bugs.some((b) => b.x === x && b.y === y)) return;

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
    updated = performAction(updated, action, x, y, showWarning, () => {
      showWarning("🌊 Plant Seeds in Hydro Tiles.\n⏱️ Half grow time.\n🐞 No bugs.\n💧 -3 Water/sec while growing");
    });
  }
  setGame(updated);
};

  const togglePause = () => {
    setGame(prev => ({
      ...prev,
      isPaused: !prev.isPaused,
    }));
  };

const handleSelectAll = () => {
  const allCoords = [];
  for (let x = 0; x < game.gridSize; x++) {
    for (let y = 0; y < game.gridSize; y++) {
      allCoords.push({ x, y });
    }
  }
  setSelectedTiles(allCoords);
};

  const isMobile = window.innerWidth < 640;
  const tileSize = isMobile
    ? Math.floor(window.innerWidth / (game?.gridSize + 2))
    : 48;

  
  
    if (!loaded || !game) return <div className="text-center p-10">Loading your game...</div>;

  

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start bg-gray-100 p-4">
      <div className="max-w-4xl w-full flex flex-col space-y-4">
        <GameHeader
          game={game}
          elapsedTime={elapsedTime}
          isPaused={game.isPaused}
          onTogglePause={togglePause}
          lastWaterUsedRef={lastWaterUsedRef}
          onAddWater={() => {
            if (!game.isPaused) {
              setGame(prev => ({ ...prev, water: prev.water + 1 }));
            }
          }}
          onSaveScore={() => {
            const previous = localStorage.getItem("farmgame_best");
            const currentScore = { time: elapsedTime, seeds: game.seeds };
            if (!previous || elapsedTime < JSON.parse(previous).time) {
              localStorage.setItem("farmgame_best", JSON.stringify(currentScore));
            }
            setGame(prev => ({
              ...prev,
              showWinModal: false,
              isPaused: false,
            }));
          }}
          onCloseWinModal={() => setGame({ ...game, showWinModal: false })}
        />

        <div className="w-full flex flex-col items-center space-y-2">
          {Array.isArray(game.grid) && game.grid.every(Array.isArray) && (
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
                    tileSize={tileSize}
                    isSelected={selectedTiles.some(t => t.x === x && t.y === y)}
                    hasBug={game.bugs.some(b => b.x === x && b.y === y)}
                    onClick={() => handleTileClick(x, y, true)}
                    onStartDrag={handleMouseDown}
                    onDuringDrag={handleMouseEnter}
                    onEndDrag={handleMouseUp}
                  />
                ))
              )}
            </div>
          )}

          {selectedTiles.length > 0 && (
            <div className={`w-full max-w-[300px] ${game.isPaused ? 'pointer-events-none opacity-50' : ''}`}>
              <SelectionToolbar
                selectedTiles={selectedTiles}
                onAction={handleBulkAction}
                onClear={() => setSelectedTiles([])}
                onSelectAll={handleSelectAll}
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
              const updated = performAction(game, action, i, j, showWarning, () => {
  if (!hasSeenHydroInfo) {
    setHasSeenHydroInfo(true);
    localStorage.setItem("seen_hydro_info", "true");
    showWarning("🌊 Plant Seeds in Hydro Tiles.\n⏱️ Half grow time.\n🐞 No bugs.\n💧 -3 Water/sec while growing");
  }
});
              setGame(updated);
              setModalTile(null);
            }}
            onClose={() => setModalTile(null)}
            expansionCost={game.expansionCost}
          />
        )}

        {game.isPaused && (
  <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 backdrop-blur-md z-40 rounded-lg p-6 w-[90%] max-w-md shadow-lg text-white text-center">
    <h2 className="text-3xl font-bold mb-4">Game Paused</h2>
    <button onClick={togglePause} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded text-lg shadow mb-3">Resume</button>
    <button
      onClick={() => {
        localStorage.removeItem("farmgame_save");
        const fresh = createGameState();
        setGame(fresh);
        gameRef.current = fresh;
        setElapsedTime(0);
        setSelectedTiles([]);
        setModalTile(null);
        dragging.current = false;
        setStartCoords(null);
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
        {notification && (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-200 border border-yellow-400 text-yellow-900 px-6 py-3 rounded shadow-lg z-50">
    {notification}
    <button
      className="ml-4 text-sm text-gray-700 underline"
      onClick={() => setNotification(null)}
    >
      Close
    </button>
  </div>
)}
{game.showHireHelp && (
  <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mt-6">
    <h2 className="text-2xl font-bold mb-2 text-center text-green-700">💼 Hire Help</h2>
    <p className="text-sm mb-4 text-center text-gray-500">
      You’ve unlocked the ability to hire farmers to assist on your land.
    </p>

    {/* We’ll add hire buttons here next */}
    <div className="flex flex-col items-center gap-3">
  <Button
    onClick={handleHireFarmer}
    className="bg-green-600 text-white hover:bg-green-700 px-6 py-2 rounded-md"
    disabled={game.food < 10 || !!farmer}
  >
    {farmer ? "👨‍🌾 Farmer Working" : "👨‍🌾 Hire Farmer (900 Food)"}
  </Button>

  {farmer && (
    <div className="text-sm text-green-700 dark:text-green-300 text-center">
      1 Farmer harvesting...<br />
      ⏳ Time remaining: <span className="font-mono">{timeRemaining}</span>
    </div>
  )}
</div>
  </div>
)}
      </div>
    </div>
  );
}