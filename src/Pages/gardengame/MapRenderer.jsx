// src/Pages/gardengame/MapRenderer.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, MAX_PLANTS_PER_LEVEL } from "./config";
import { createInitialMap, getGreenPercent } from "./utils/mapUtils";
import { drawCanvas } from "./utils/drawUtils";
import { handleKeyDownFactory, handleKeyUpFactory } from "./utils/controls";
import MobileControls from "./components/MobileControls";

export default function MapRenderer() {
  const canvasRef = useRef(null);
  const initialMap = useMemo(() => {
  const map = createInitialMap();
  map[5][5] = "grass";
  return map;
}, []);

  const [maps, setMaps] = useState({ 1: initialMap });
  const [level, setLevel] = useState(1);
  const [player, setPlayer] = useState({ x: 5, y: 5 });
  const [plants, setPlants] = useState({ 1: [] });
  const [projectiles, setProjectiles] = useState([]);
  const [moveCount, setMoveCount] = useState(0);
  const [shownLevels, setShownLevels] = useState([1]);
  const [message, setMessage] = useState({
    text: "50% green unlocks next level. WASD moves and Space to plant or harvest.",
    turnsLeft: 1,
  });
  const [inventoryProjectiles, setInventoryProjectiles] = useState(0);
  const [shiftPressed, setShiftPressed] = useState(false);
  const [enemies, setEnemies] = useState({});
  const [hasShown50, setHasShown50] = useState(false);
  const [seedType, setSeedType] = useState(1);
  const [seedPickups, setSeedPickups] = useState([{ x: 3, y: 3, level: 1, type: 1 }]);
  const [seedInventory, setSeedInventory] = useState({ 1: 0 });
  const [unlockedSeeds, setUnlockedSeeds] = useState({ 2: false });
  const [shootingMode, setShootingMode] = useState(false);
  const [lives, setLives] = useState(3);
  const [isDead, setIsDead] = useState(false);
  const [enemyMoveCooldown, setEnemyMoveCooldown] = useState(0);

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
  [newLevel]:
    prev[newLevel] ||
    Array.from({ length: newLevel }, (_, i) => ({
      id: crypto.randomUUID(),
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
  if (isDead) return;
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

  const prevPlayerPos = { x: player.x, y: player.y };
  const newMap = maps[level].map((row) => [...row]);
  newMap[newY][newX] = "grass";

  const currentEnemiesSnapshot = enemies[level]?.map(e => ({ ...e })) || [];

  updateProjectiles(currentEnemiesSnapshot); // ✅ Projectiles hit BEFORE enemies move

  setPlayer({ x: newX, y: newY });
  setMaps((prev) => ({ ...prev, [level]: newMap }));

  setMoveCount(prev => prev + 1);
updateEnemies(prevPlayerPos, newMap);
};
  const handlePlantSeed = () => {
    const plantHere = currentPlants.find((p) => p.x === player.x && p.y === player.y);
    if (plantHere) {
      setPlants((prev) => ({
        ...prev,
        [level]: prev[level].filter((p) => !(p.x === player.x && p.y === player.y)),
      }));
      setSeedInventory((prev) => ({
        ...prev,
        [plantHere.type]: (prev[plantHere.type] || 0) + 1,
      }));
      showMessage(`🌱 Harvested seed type ${plantHere.type}`);
      return;
    }

    const seedHere = seedPickups.find((p) => p.level === level && p.x === player.x && p.y === player.y);
    if (seedHere) {
      setSeedInventory((prev) => ({
        ...prev,
        [seedHere.type]: (prev[seedHere.type] || 0) + 1,
      }));
      setSeedPickups((prev) => prev.filter((p) => !(p.level === level && p.x === player.x && p.y === player.y)));
      showMessage(`Picked up Seed Type ${seedHere.type}. Use Q/E to switch.`);
      return;
    }

    if (
      (seedInventory[seedType] || 0) > 0 &&
      maps[level][player.y][player.x] === "grass" &&
      !currentPlants.some((p) => p.x === player.x && p.y === player.y)
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

const findNearestGrass = (x, y, map) => {
  let closest = null;
  let closestDist = Infinity;

  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[0].length; col++) {
      if (map[row][col] === "grass") {
        const dist = Math.abs(x - col) + Math.abs(y - row);
        if (dist < closestDist) {
          closest = { x: col, y: row };
          closestDist = dist;
        }
      }
    }
  }

  return closest;
};

const updateEnemies = (prevPlayerPos, providedMap = null, currentEnemies = null, enemiesToRemove = new Set()) => {
  const workingMap = providedMap || maps[level].map((row) => [...row]);
  let playerHit = false;

  setEnemies((prevEnemies) => {
    const existingPositions = new Set();
    const updated = [];

    (currentEnemies || prevEnemies[level] || []).forEach((enemy) => {
      if (enemiesToRemove.has(enemy.id)) {
    return; // ❌ skip dead enemies
  }
      const prevEnemyPos = { x: enemy.x, y: enemy.y };
      const target = findNearestGrass(enemy.x, enemy.y, workingMap);
let moved = false;

if (target) {
  let dx = 0, dy = 0;
if (enemy.x !== target.x) {
  dx = target.x > enemy.x ? 1 : -1;
} else if (enemy.y !== target.y) {
  dy = target.y > enemy.y ? 1 : -1;
}

const newX = enemy.x + dx;
const newY = enemy.y + dy;
  const key = `${newX},${newY}`;
  const isProjectileThere = projectiles.some((p) => p.x === newX && p.y === newY);

  if (newX === player.x && newY === player.y) {
  // Don't move, just flag hit and stay put
  playerHit = true;
  updated.push(enemy);
  existingPositions.add(`${enemy.x},${enemy.y}`);
  moved = true;
} else if (
  newX >= 0 &&
  newX < MAP_WIDTH &&
  newY >= 0 &&
  newY < MAP_HEIGHT &&
  workingMap[newY][newX] !== "wall" &&
  !existingPositions.has(key) &&
  !isProjectileThere
) {
  workingMap[newY][newX] = "dirt";
  updated.push({ ...enemy, x: newX, y: newY });
  existingPositions.add(key);
  moved = true;
}
}

      if (!moved) {
        updated.push(enemy); // ✅ do nothing if no move — just keep as is
        existingPositions.add(`${enemy.x},${enemy.y}`);
      }
    });

    setMaps((prev) => ({ ...prev, [level]: workingMap }));

    if (playerHit && !isDead) {
      setLives((prev) => {
        const remaining = prev - 1;
        if (remaining <= 0) {
          setIsDead(true);
          showMessage("💀 You died! Game Over.", 10);
        } else {
          showMessage(`😵 You were hit! ${remaining} lives left.`, 4);
          setPlayer({ x: 5, y: 5 });
        }
        return remaining;
      });
    }

    return { ...prevEnemies, [level]: updated };
  });
};


  const updateProjectiles = (currentEnemiesSnapshot) => {
  let enemiesToRemove = new Set();
  let newProjectiles = [];

  setProjectiles((prev) => {
    let newProjectiles = [];

    prev.forEach((proj) => {
      const path = [
        { x: Math.floor(proj.x + proj.dx), y: Math.floor(proj.y + proj.dy) },
        { x: Math.floor(proj.x + proj.dx * 2), y: Math.floor(proj.y + proj.dy * 2) },
      ];

      let hit = false;
      for (const pos of path) {
        for (const e of currentEnemiesSnapshot) {
          if (e.x === pos.x && e.y === pos.y) {
            enemiesToRemove.add(e.id);
            hit = true;
            break;
          }
        }
        if (hit) break;
      }

      if (!hit) {
        const nextX = proj.x + proj.dx * 2;
        const nextY = proj.y + proj.dy * 2;

        if (
          nextX >= 0 &&
          nextX < MAP_WIDTH &&
          nextY >= 0 &&
          nextY < MAP_HEIGHT
        ) {
          newProjectiles.push({ ...proj, x: nextX, y: nextY });
        }
      }
    });

    return newProjectiles;
  });

  return enemiesToRemove; // return the *set* of IDs
};
  
  const shootProjectile = (dx, dy) => {
  if (isDead) return;
  if (inventoryProjectiles > 0) {
    setProjectiles((prev) => [...prev, { x: player.x, y: player.y, dx, dy }]);
    setInventoryProjectiles((prev) => prev - 1);
    setMoveCount(prev => prev + 1); // Let the full turn tick handle everything else
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
    const currentMap = maps[level];
    if (currentMap)
      drawCanvas(
        canvasRef,
        currentMap,
        player,
        plants[level] || [],
        projectiles,
        enemies[level] || [],
        seedPickups.filter((p) => p.level === level),
      );
  }, [maps, player, plants, projectiles, enemies, seedPickups, level]);

  useEffect(() => {

    const current = plants[level] || [];
    let gained = 0;

    current.forEach((plant) => {
      if (plant.type === 1 && (moveCount - plant.plantedAt) % 10 === 0 && moveCount !== plant.plantedAt) {
        gained++;
      }
      if (plant.type === 2 && (moveCount - plant.plantedAt) % 5 === 0 && moveCount !== plant.plantedAt) {
        const dirs = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
        ];
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

    const currentEnemiesSnapshot = enemies[level]?.map((e) => ({ ...e })) || [];
const enemiesToRemove = updateProjectiles(currentEnemiesSnapshot);
const prevPlayerPos = { x: player.x, y: player.y };
updateEnemies(prevPlayerPos, null, null, enemiesToRemove);

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
        style={{ minHeight: "40px" }}
      >
        <span className="truncate w-full text-center">{message.text || "\u00A0"}</span>
      </div>

      {/* Game UI Layout */}
      <div className="flex justify-center items-start w-full max-w-[600px] relative">
        {/* Center Canvas */}
        <canvas
          ref={canvasRef}
          width={MAP_WIDTH * TILE_SIZE}
          height={MAP_HEIGHT * TILE_SIZE}
          style={{
            display: "block",
            width: `${MAP_WIDTH * TILE_SIZE}px`,
            height: `${MAP_HEIGHT * TILE_SIZE}px`,
            maxWidth: "100%",
          }}
          className="border-2 border-gray-700 mx-4"
        />

        {/* Right Side: Mobile Controls */}
        <div className="p-2 md:hidden">
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

      {/* Game Info Below */}
      <div className="flex flex-wrap justify-center text-white text-sm space-x-4 space-y-1 mt-4 px-2">
        <p>❤️ Lives: {lives}</p>
        <p>
          🌱 Equipped: {seedType === 1 ? "Ammo Generator" : seedType === 2 ? "Turret" : `Type ${seedType}`}
        </p>
        <p>🎯 Ammo Generator: {seedInventory[1] || 0}</p>
        <p>🛡️ Turret: {seedInventory[2] || 0}</p>
        <p>💥 Projectiles: {inventoryProjectiles}</p>
        <p>🗺️ Level: {level}</p>
        <p>👣 Moves: {moveCount}</p>
        <p>✅ Map: {greenPercent.toFixed(1)}%</p>
      </div>
      <p className="text-white text-sm mt-2">
  🧱 Tile Under Player: {map[player.y]?.[player.x]}
</p>
      {isDead && (
        <button
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
          onClick={() => window.location.reload()}
        >
          Restart Game
        </button>
      )}
    </div>
  );
}
