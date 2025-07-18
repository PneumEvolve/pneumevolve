// src/Pages/farmgame/FarmGame.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
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

const API = import.meta.env.VITE_API_URL;

function getSavedGameFromLocalStorage() {
  const saved = localStorage.getItem("farmgame_save");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to parse saved game:", e);
    }
  }
  return null;
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
  const [loaded, setLoaded] = useState(false);

  const [selectedTiles, setSelectedTiles] = useState([]);
  const [modalTile, setModalTile] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const dragging = useRef(false);
  const gameRef = useRef(null);

  useEffect(() => {
    const loadGame = async () => {
      if (accessToken && userId) {
        try {
          const res = await axios.get(`${API}/farmgame/state`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (res.data?.data) {
            const parsed = JSON.parse(res.data.data);
            setGame(parsed);
            setElapsedTime(parsed.elapsedTime || 0);
            gameRef.current = parsed;
          } else {
            const local = getSavedGameFromLocalStorage();
            if (local) {
              setGame(local);
              setElapsedTime(local.elapsedTime || 0);
              gameRef.current = local;
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
            setGame(local);
            setElapsedTime(local.elapsedTime || 0);
            gameRef.current = local;
          } else {
            const fresh = createGameState();
            setGame(fresh);
            gameRef.current = fresh;
          }
        }
      } else {
        const local = getSavedGameFromLocalStorage();
        if (local) {
          setGame(local);
          setElapsedTime(local.elapsedTime || 0);
          gameRef.current = local;
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
      const updatedGame = tick({ ...gameRef.current });
      gameRef.current = updatedGame;
      setGame(updatedGame);
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (game) gameRef.current = game;
  }, [game]);

  useEffect(() => {
    if (!game) return;
    localStorage.setItem("farmgame_save", JSON.stringify({ ...game, elapsedTime }));
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
      }));
    }
  }, [game, elapsedTime]);

  useEffect(() => {
    if (!accessToken || !userId || !game) return;

    const saveGame = async () => {
      try {
        await axios.post(
          `${API}/farmgame/state`,
          { data: JSON.stringify({ ...game, elapsedTime }) },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      } catch (err) {
        console.error("Error saving game:", err);
      }
    };

    saveGame();
  }, [game, elapsedTime, accessToken, userId]);

  const handleTileClick = (x, y, requestModal = false) => {
    if (game.isPaused) return;
    const tile = game.grid[x][y];
    const hasBug = game.bugs.some((b) => b.x === x && b.y === y);

    if (hasBug) {
      const updated = performAction(game, "squashBug", x, y);
      setGame(updated);
      return;
    }

    const growTime = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
    const isHarvestable = tile.type === TILE_TYPES.PLANTED && tile.growth >= growTime;

    if (isHarvestable) {
  const updated = performAction(game, "harvest", x, y);
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
    const updated = performAction(game, action, x, y);
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
            <button onClick={() => { localStorage.removeItem("farmgame_best"); alert("Best score reset."); }} className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2 rounded text-sm">🧹 Reset High Score</button>
          </div>
        )}
      </div>
    </div>
  );
}