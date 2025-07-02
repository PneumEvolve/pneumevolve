// src/Pages/gardengame/MapRenderer.jsx
import React, { useEffect, useRef, useState } from "react";
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, MAX_PLANTS_PER_LEVEL } from "./config";
import { createInitialMap, getGreenPercent } from "./utils/mapUtils";
import { drawCanvas } from "./utils/drawUtils";
import { handleKeyDownFactory, handleKeyUpFactory } from "./utils/controls";
import MobileControls from "./components/MobileControls";

export default function MapRenderer() {
  const canvasRef = useRef(null);

  // ✅ Move this block inside the function body:
  const initialMap = createInitialMap();
  initialMap[5][5] = "grass"; // Make the spawn tile green

  const [maps, setMaps] = useState({ 1: initialMap });
  const [level, setLevel] = useState(1);
  const [player, setPlayer] = useState({ x: 5, y: 5 });
  const [plants, setPlants] = useState({ 1: [] });
  const [projectiles, setProjectiles] = useState([]);
  const [moveCount, setMoveCount] = useState(0);
  const [shownLevels, setShownLevels] = useState([1]);
  const [message, setMessage] = useState({ text: "50% green unlocks next level. WASD moves and Space to plant or harvest.", turnsLeft: 1 });
  const [inventoryProjectiles, setInventoryProjectiles] = useState(0);
  const [shiftPressed, setShiftPressed] = useState(false);
  const [enemies, setEnemies] = useState({});
  const [hasShown50, setHasShown50] = useState(false);
  const [seedType, setSeedType] = useState(1);
  const [seedPickups, setSeedPickups] = useState([{ x: 3, y: 3, level: 1, type: 1 }]);
  const [seedInventory, setSeedInventory] = useState({ 1: 0 });
  const [unlockedSeeds, setUnlockedSeeds] = useState({ 2: false });
  const [shootingMode, setShootingMode] = useState(false);

  const map = maps[level];
  const currentPlants = plants[level] || [];
  const currentEnemies = enemies[level] || [];
  const greenPercent = getGreenPercent(map);

  const showMessage = (text, turns = 1) => setMessage({ text, turnsLeft: turns });

  const tryLevelAdvance = (direction) => {
    const newLevel = direction === "right" ? level + 1 : level - 1;
    if (direction === "right" && player.x === MAP_WIDTH - 1 && greenPercent >= 50) {
      if (!shownLevels.includes(newLevel)) {
        setShownLevels((prev) => [...prev, newLevel]);
        showMessage("New Level Unlocked");
      }
      setLevel(newLevel);
      setMaps((prev) => {
        const newMap = prev[newLevel] || createInitialMap();
        const spawnY = player.y;
newMap[spawnY][0] = "grass"; // Correctly set new spawn point to green
        return { ...prev, [newLevel]: newMap };
      });
      setPlants((prev) => ({ ...prev, [newLevel]: prev[newLevel] || [] }));
      setEnemies((prev) => ({
        ...prev,
        [newLevel]: prev[newLevel] || Array.from({ length: newLevel }, (_, i) => ({
          x: (i * 2 + 2) % MAP_WIDTH,
          y: (i * 3 + 3) % MAP_HEIGHT,
        })),
      }));
      setPlayer((prev) => ({ x: 0, y: prev.y }));
    } else if (direction === "left" && player.x === 0 && level > 1) {
      setLevel(newLevel);
      setPlayer((prev) => ({ x: MAP_WIDTH - 1, y: prev.y }));
    }
  };

  const handleMovement = (dx, dy) => {
  if (shootingMode) {
    shootProjectile(dx, dy);
    setShootingMode(false);
    return;
  }

  const newX = player.x + dx;
  const newY = player.y + dy;

  if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) {
    if (dx < 0) tryLevelAdvance("left");
    else if (dx > 0) tryLevelAdvance("right");
    return;
  }

  setPlayer({ x: newX, y: newY });
  setMaps((prev) => {
    const newMap = prev[level].map((row) => [...row]);
    newMap[newY][newX] = "grass";
    return { ...prev, [level]: newMap };
  });
  setMoveCount((prev) => prev + 1);
  setMessage((prev) =>
    prev.turnsLeft > 1 ? { ...prev, turnsLeft: prev.turnsLeft - 1 } : { text: "", turnsLeft: 0 }
  );
};

  const handlePlantSeed = () => {
    const plantHere = currentPlants.find(p => p.x === player.x && p.y === player.y);
    if (plantHere) {
      setPlants((prev) => ({
        ...prev,
        [level]: prev[level].filter(p => !(p.x === player.x && p.y === player.y)),
      }));
      setSeedInventory((prev) => ({
        ...prev,
        [plantHere.type]: (prev[plantHere.type] || 0) + 1,
      }));
      showMessage(`🌱 Harvested seed type ${plantHere.type}`);
      return;
    }

    const seedHere = seedPickups.find(p => p.level === level && p.x === player.x && p.y === player.y);
    if (seedHere) {
      setSeedInventory((prev) => ({
        ...prev,
        [seedHere.type]: (prev[seedHere.type] || 0) + 1,
      }));
      setSeedPickups((prev) => prev.filter(p => !(p.level === level && p.x === player.x && p.y === player.y)));
      showMessage(`Picked up Seed Type ${seedHere.type}. Use Q/E to switch.`);
      return;
    }

    if (
      (seedInventory[seedType] || 0) > 0 &&
      map[player.y][player.x] === "grass" &&
      !currentPlants.some(p => p.x === player.x && p.y === player.y)
    ) {
      const newPlant = { x: player.x, y: player.y, plantedAt: moveCount, type: seedType };
      setPlants((prev) => ({
        ...prev,
        [level]: [...(prev[level] || []), newPlant],
      }));
      setSeedInventory((prev) => ({
        ...prev,
        [seedType]: prev[seedType] - 1,
      }));
      showMessage(`Seed type ${seedType} planted!`);
    }
  };

 const updateEnemies = () => {
  setEnemies((prevEnemies) => {
    const newMap = maps[level].map((row) => [...row]);
    const existingPositions = new Set();
    const updated = [];

    (prevEnemies[level] || []).forEach((enemy) => {
      const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

      // Shuffle directions for randomness
      for (let i = directions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [directions[i], directions[j]] = [directions[j], directions[i]];
      }

      let moved = false;
      for (const [dx, dy] of directions) {
        const newX = enemy.x + dx;
        const newY = enemy.y + dy;
        const key = `${newX},${newY}`;

        if (
          newX >= 0 && newX < MAP_WIDTH &&
          newY >= 0 && newY < MAP_HEIGHT &&
          newMap[newY][newX] !== "wall" &&
          !existingPositions.has(key)
        ) {
          newMap[newY][newX] = "dirt"; // destroy green tile
          updated.push({ x: newX, y: newY });
          existingPositions.add(key);
          moved = true;
          break;
        }
      }

      if (!moved) {
        // Stay in place
        updated.push(enemy);
        existingPositions.add(`${enemy.x},${enemy.y}`);
      }
    });

    setMaps((prev) => ({ ...prev, [level]: newMap }));
    return { ...prevEnemies, [level]: updated };
  });
};

  const updateProjectiles = () => {
  let enemiesToRemove = new Set();

  setProjectiles((prev) => {
    const newProjectiles = [];

    prev.forEach((proj) => {
      const path = [
        { x: proj.x + proj.dx, y: proj.y + proj.dy },
        { x: proj.x + proj.dx * 2, y: proj.y + proj.dy * 2 },
      ];

      let hit = false;
      for (const pos of path) {
        currentEnemies.forEach((e, index) => {
          if (e.x === pos.x && e.y === pos.y) {
            enemiesToRemove.add(index);
            hit = true;
          }
        });
        if (hit) break;
      }

      if (!hit) {
        const last = path[path.length - 1];
        newProjectiles.push({ ...proj, x: last.x, y: last.y });
      }
    });

    // Remove hit enemies
    if (enemiesToRemove.size > 0) {
      setEnemies((prev) => {
        const updated = [...(prev[level] || [])].filter((_, idx) => !enemiesToRemove.has(idx));
        return { ...prev, [level]: updated };
      });
    }

    return newProjectiles;
  });
};

  const shootProjectile = (dx, dy) => {
    if (inventoryProjectiles > 0) {
      setProjectiles((prev) => [...prev, { x: player.x, y: player.y, dx, dy }]);
      setInventoryProjectiles((prev) => prev - 1);
      setMoveCount((prev) => prev + 1);
    } else {
      showMessage("No projectiles!");
    }
  };

  const handleKeyDown = handleKeyDownFactory({
    setShiftPressed,
    shiftPressed,
    shootProjectile,
    handleMovement,
    handlePlantSeed,
    setSeedType: (fn) => {
      setSeedType((prev) => {
        const next = fn(prev);
        return seedInventory[next] > 0 ? next : prev;
      });
    },
    seedType,
    seedInventory,
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    const handleKeyUp = handleKeyUpFactory(setShiftPressed);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (map) drawCanvas(canvasRef, map, player, currentPlants, projectiles, currentEnemies, seedPickups.filter(p => p.level === level));
  }, [map, player, currentPlants, projectiles, currentEnemies, seedPickups]);

  useEffect(() => {
    updateProjectiles();
    updateEnemies();

    const current = plants[level] || [];
    let gained = 0;

    current.forEach((plant) => {
      if (plant.type === 1 && (moveCount - plant.plantedAt) % 10 === 0 && moveCount !== plant.plantedAt) {
        gained++;
      }
      if (plant.type === 2 && (moveCount - plant.plantedAt) % 5 === 0 && moveCount !== plant.plantedAt) {
        const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
        setProjectiles((prev) => [
          ...prev,
          ...dirs.map(({ dx, dy }) => ({ x: plant.x, y: plant.y, dx, dy })),
        ]);
      }
    });

    if (gained > 0) {
      setInventoryProjectiles((prev) => prev + gained);
      showMessage(`Gained ${gained} projectile(s)!`);
    }

    if (greenPercent >= 50 && !hasShown50) {
      showMessage("Map 50%! New level unlocked.");
      setHasShown50(true);
    }
    if (greenPercent === 100) {
      showMessage("Map complete! Move right to proceed.");
    }

    if (level === 2 && enemies[2]?.length === 0 && !unlockedSeeds[2]) {
      showMessage("🎁 You unlocked Seed Type 2!");
      setSeedPickups((prev) => [...prev, { x: 5, y: 5, level: 2, type: 2 }]);
      setUnlockedSeeds((prev) => ({ ...prev, 2: true }));
    }
  }, [moveCount]);

return (
  <div className="flex flex-col items-center w-full min-h-screen overflow-hidden bg-black text-white">
    {/* Message Bar */}
    <div
      className="h-10 flex items-center justify-center text-sm mb-2 bg-white text-black rounded shadow px-4 w-full max-w-[600px]"
      style={{ minHeight: '40px' }}
    >
      <span className="truncate w-full text-center">{message.text || '\u00A0'}</span>
    </div>

    {/* Game UI Layout */}
    <div className="flex justify-center items-start w-full max-w-[600px] relative">
      {/* Left Side: Game Info */}
      <div className="flex flex-col text-white text-sm space-y-1 p-2">
        <p>Seed Type: {seedType}</p>
        <p>Seed 1 (projectile): {seedInventory[1] || 0}</p>
        <p>Seed 2 (turret): {seedInventory[2] || 0}</p>
        <p>Projectiles: {inventoryProjectiles}</p>
        <p>Level: {level}</p>
        <p>Moves: {moveCount}</p>
        <p>Map %: {greenPercent.toFixed(1)}%</p>
      </div>

      {/* Center Canvas */}
      <canvas
        ref={canvasRef}
        width={MAP_WIDTH * TILE_SIZE}
        height={MAP_HEIGHT * TILE_SIZE}
        style={{
          display: 'block',
          width: `${MAP_WIDTH * TILE_SIZE}px`,
          height: `${MAP_HEIGHT * TILE_SIZE}px`,
          maxWidth: '100%',
        }}
        className="border-2 border-gray-700 mx-4"
      />

      {/* Right Side: Mobile Controls */}
      <div className="p-2">
        <MobileControls
  onMove={(dx, dy) => {
    if (shootingMode) {
      shootProjectile(dx, dy);
      setShootingMode(false);
    } else {
      handleMovement(dx, dy);
    }
  }}
  onShoot={() => {
    setShootingMode((prev) => {
      const next = !prev;
      showMessage(next ? "🏹 Choose shoot direction!" : "❌ Cancelled shooting", 2);
      return next;
    });
  }}
  onPlant={handlePlantSeed}
  onToggleSeed={(dir) => {
    setSeedType((prev) => {
      const newType = prev + dir;
      const maxType = Object.keys(seedInventory).length;
      const wrapped = ((newType - 1 + maxType) % maxType) + 1;
      return seedInventory[wrapped] > 0 ? wrapped : prev;
    });
  }}
/>
      </div>
    </div>
  </div>
);
}