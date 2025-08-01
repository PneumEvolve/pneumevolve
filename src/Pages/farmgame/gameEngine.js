// src/Pages/farmgame/gameEngine.js

/* ------------------------------------------------------------------
 * Core constants
 * ------------------------------------------------------------------ */
export const GRID_SIZE = 2; // starting board size

export const TILE_TYPES = {
  EMPTY: "empty",
  DIRT: "dirt",
  PLANTED: "planted",
};

export const UPGRADE_TYPES = {
  WATER: "waterUpgrade",
  HYDRO: "hydro",
  EXPAND: "expand",
};

/* ------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------ */
const makeEmptyTile = () => ({
  type: TILE_TYPES.EMPTY,
  growth: 0,
  upgrade: null,
  hasWater: false,
});

const makeGrid = (size) =>
  Array.from({ length: size }, () =>
    Array.from({ length: size }, () => makeEmptyTile()),
  );

/**
 * Defensive normalizer for any loaded game state (localStorage / backend).
 * Ensures required fields and valid grid.
 */
export function normalizeState(raw) {
  const fallback = {
  water: 0,
  seeds: 1,
  food: 0,
  bonusWater: 0,
  gridSize: GRID_SIZE,
  expansionCost: 5,
  bugs: [],
  tickCount: 0,
  isPaused: false,
  hasWon: false,
  showWinModal: false,
  winTime: null,
  showHireHelp: false,
};

  if (!raw || typeof raw !== "object") return fallback;

  const size =
    typeof raw.gridSize === "number" && raw.gridSize > 0 ? raw.gridSize : fallback.gridSize;

  // Build a fresh grid, overlaying whatever we can salvage from raw.grid
  const grid = makeGrid(size);
  if (Array.isArray(raw.grid)) {
    for (let i = 0; i < size; i++) {
      const row = raw.grid[i];
      if (!Array.isArray(row)) continue;
      for (let j = 0; j < size; j++) {
        const t = row[j];
        if (!t) continue;
        grid[i][j] = {
          type: typeof t.type === "string" ? t.type : TILE_TYPES.EMPTY,
          growth: typeof t.growth === "number" ? t.growth : 0,
          upgrade: t.upgrade ?? null,
          hasWater: !!t.hasWater,
        };
      }
    }
  }

  return {
    // core resources
    water: typeof raw.water === "number" ? raw.water : fallback.water,
    seeds: typeof raw.seeds === "number" ? raw.seeds : fallback.seeds,
    food: typeof raw.food === "number" ? raw.food : fallback.food,
    bonusWater:
      typeof raw.bonusWater === "number" ? raw.bonusWater : fallback.bonusWater,

    // grid + expansion
    gridSize: size,
    grid,
    expansionCost:
      typeof raw.expansionCost === "number"
        ? raw.expansionCost
        : fallback.expansionCost,

    // bugs
    bugs: Array.isArray(raw.bugs)
      ? raw.bugs
          .filter((b) => b && typeof b.x === "number" && typeof b.y === "number")
          .map((b) => ({ x: b.x, y: b.y, age: typeof b.age === "number" ? b.age : 0 }))
      : [],

    // ticks
    tickCount:
      typeof raw.tickCount === "number" ? raw.tickCount : fallback.tickCount,

    // UI/game flags expected by FarmGame.jsx
    isPaused: !!raw.isPaused,
    hasWon: !!raw.hasWon,
    showWinModal: !!raw.showWinModal,
    winTime:
      typeof raw.winTime === "number" ? raw.winTime : null,
    showHireHelp: !!raw.showHireHelp,
  };
}

/* ------------------------------------------------------------------
 * Base state factory
 * ------------------------------------------------------------------ */
export const createGameState = () =>
  normalizeState({
    water: 0,
    seeds: 1,
    food: 0,
    bonusWater: 0,
    gridSize: GRID_SIZE,
    grid: makeGrid(GRID_SIZE),
    tickCount: 0,
    expansionCost: 5,
    bugs: [],
    isPaused: false,
    hasWon: false,
    showWinModal: false,
    winTime: null,
  });

/* ------------------------------------------------------------------
 * Tick loop
 * ------------------------------------------------------------------ */
export function tick(state) {
  let waterUsed = 0;
  if (!state || !Array.isArray(state.grid)) {
    console.warn("⚠️ Invalid game state passed to tick(). Resetting...");
    return createGameState();
  }

  const game = normalizeState(state);
  let { water, grid } = game;
  let plantedCount = 0;
  let hydroDrain = 0;

  // Grow plants
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i];
    if (!Array.isArray(row)) continue;

    for (let j = 0; j < row.length; j++) {
      const tile = row[j];
      if (!tile) continue;

      const bugHere = game.bugs.some((b) => b.x === i && b.y === j);

      if (tile.type === TILE_TYPES.PLANTED) {
        if (bugHere) {
          tile.hasWater = false;
          continue;
        }

        const isHydro = tile.upgrade === UPGRADE_TYPES.HYDRO;
        const drain = isHydro ? 3 : 1;
        const growLimit = isHydro ? 10 : 20;

        if (water >= drain) {
          water -= drain;
          tile.growth += 1;

          if (tile.growth === growLimit) {
            tile.justGrown = true;
          }
        }

        if (tile.growth > growLimit || tile.justGrown) {
          tile.justGrown = false;
        }

        tile.hasWater = true;
        plantedCount++;
        if (isHydro) hydroDrain++;
      }
    }
  }

  // ✅ Passive regen
  water += 1 + game.bonusWater;

  // ✅ Bug spawning
  if (game.tickCount % 10 === 0) {
    const plantedTiles = [];
    for (let i = 0; i < grid.length; i++) {
      const row = grid[i];
      if (!Array.isArray(row)) continue;
      for (let j = 0; j < row.length; j++) {
        const tile = row[j];
        if (
          tile?.type === TILE_TYPES.PLANTED &&
          tile.upgrade !== UPGRADE_TYPES.HYDRO
        ) {
          plantedTiles.push({ x: i, y: j });
        }
      }
    }
    if (plantedTiles.length > 0 && game.bugs.length < 5) {
      const spawn = plantedTiles[Math.floor(Math.random() * plantedTiles.length)];
      game.bugs.push({ x: spawn.x, y: spawn.y, age: 0 });
    }
  }

  // ✅ Bug aging
  const updatedBugs = [];
  for (const bug of game.bugs) {
    const age = (bug.age ?? 0) + 1;
    if (age < 10) updatedBugs.push({ ...bug, age });
  }

  return {
    ...game,
    water,
    waterUsed,
    grid,
    plantedCount,
    hydroCount: hydroDrain,
    bugs: updatedBugs,
    tickCount: game.tickCount + 1,
  };
}

/* ------------------------------------------------------------------
 * Action reducer
 * ------------------------------------------------------------------ */

// Utility: safe copy + update a single tile
function updateTile(state, x, y, mutFn) {
  const game = normalizeState(state);
  if (
    x < 0 ||
    y < 0 ||
    x >= game.gridSize ||
    y >= game.gridSize ||
    !Array.isArray(game.grid[x])
  ) {
    return game;
  }

  const oldTile = game.grid[x][y];
  const newTile = mutFn(oldTile);
  const newGrid = game.grid.map((row, i) =>
    row.map((t, j) => (i === x && j === y ? newTile : t)),
  );

  return { ...game, grid: newGrid };
}

/**
 * performAction(state, action, x, y)
 *
 * IMPORTANT:
 * - Always returns a *new* normalized state.
 * - Never mutates the incoming state.
 */
export function performAction(state, action, x, y, showWarning, showHydroInfo ) {
  const game = normalizeState(state);

  if (showHydroInfo) {
    game.showHydroInfo = showHydroInfo;
  }

  // Allow "plant" alias → route to "plantSeed"
  if (action === "plant") return performAction(state, "plantSeed", x, y);

  

  // squashBug is special (doesn't need tile)
  if (action === "squashBug") {
    const bugs = game.bugs.filter((b) => !(b.x === x && b.y === y));
    return { ...game, bugs };
  }

  // All other actions need a valid tile
  if (
    x < 0 ||
    y < 0 ||
    x >= game.gridSize ||
    y >= game.gridSize ||
    !Array.isArray(game.grid[x])
  ) {
    return game;
  }

  const tile = game.grid[x][y];

  if (["upgradeHydro", "upgradeExpand", "upgradeWater"].includes(action)) {
  if (tile.type === TILE_TYPES.DIRT) {
    const seen = localStorage.getItem("seen_dirt_warning") === "true";
    if (!seen && typeof showWarning === "function") {
      localStorage.setItem("seen_dirt_warning", "true");
      showWarning("Please remove dirt to build.");
    }
    return game;
  }
}

  switch (action) {

    /* -------------------------------------------------------------- */
    case "addDirt": {
      if (tile.type === TILE_TYPES.EMPTY && !tile.upgrade) {
        return updateTile(game, x, y, (t) => ({
          ...t,
          type: TILE_TYPES.DIRT,
        }));
      }
      return game;
    }

    /* -------------------------------------------------------------- */
    case "plantSeed": {
      const growTime = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
      const isHarvestable =
        tile.type === TILE_TYPES.PLANTED && tile.growth >= growTime;
      if (isHarvestable) return game;

      if (
        (tile.type === TILE_TYPES.DIRT ||
          tile.upgrade === UPGRADE_TYPES.HYDRO) &&
        game.seeds >= 1 &&
        tile.type !== TILE_TYPES.PLANTED
      ) {
        const next = updateTile(game, x, y, (t) => ({
          ...t,
          type: TILE_TYPES.PLANTED,
          growth: 0,
        }));
        return { ...next, seeds: next.seeds - 1 }; // subtract 1 seed
      }
      return game;
    }

    /* -------------------------------------------------------------- */
    case "harvest": {
      const growLimit = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
      if (tile.type === TILE_TYPES.PLANTED && tile.growth >= growLimit) {
        const newType =
          tile.upgrade === UPGRADE_TYPES.HYDRO ? TILE_TYPES.EMPTY : TILE_TYPES.DIRT;

        const next = updateTile(game, x, y, (t) => ({
          ...t,
          type: newType,
          growth: 0,
          // keep upgrade intact
        }));

        return {
          ...next,
          seeds: next.seeds + 2,
          food: next.food + 1,
        };
      }
      return game;
    }

    /* -------------------------------------------------------------- */
    case "removeDirt": {
  const isPlanted = tile.type === TILE_TYPES.PLANTED;
  const isDirt = tile.type === TILE_TYPES.DIRT;
  const growTime = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
  const isGrowingOrHarvestable = tile.growth > 0 || (isPlanted && tile.growth >= growTime);

  if (
    (isDirt || isPlanted) &&
    game.seeds >= 1 &&
    !isGrowingOrHarvestable
  ) {
    const next = updateTile(game, x, y, (_t) => makeEmptyTile());
    return { ...next, seeds: next.seeds - 1 };
  }

  return game; // 👈 don't change anything if blocked
}

    /* -------------------------------------------------------------- */
    case "upgradeWater": {
      if (tile.type === TILE_TYPES.EMPTY && !tile.upgrade && game.seeds >= 2) {
        const next = updateTile(game, x, y, (t) => ({
          ...t,
          upgrade: UPGRADE_TYPES.WATER,
        }));
        return {
          ...next,
          seeds: next.seeds - 2,
          bonusWater: next.bonusWater + 2,
        };
      }
      return game;
    }

    /* -------------------------------------------------------------- */
    case "upgradeHydro": {
      if (
        tile.type === TILE_TYPES.EMPTY &&
        !tile.upgrade &&
        game.seeds >= 2 &&
        game.water >= 50
      ) {
        if (typeof showHydroInfo === "function" && !localStorage.getItem("seen_hydro_info")) {
          localStorage.setItem("seen_hydro_info", "true");
          showHydroInfo();
        }

        const next = updateTile(game, x, y, (t) => ({
          ...t,
          upgrade: UPGRADE_TYPES.HYDRO,
        }));

        return {
          ...next,
          seeds: next.seeds - 2,
          water: next.water - 50,
        };
      }
      return game;
    }
  

    /* -------------------------------------------------------------- */
    case "upgradeExpand": {
      if (
        tile.type === TILE_TYPES.EMPTY &&
        !tile.upgrade &&
        game.seeds >= game.expansionCost
      ) {
        const newGridSize = game.gridSize + 1;

        // copy old grid into new larger grid
        const expandedGrid = makeGrid(newGridSize);
        for (let i = 0; i < game.gridSize; i++) {
          for (let j = 0; j < game.gridSize; j++) {
            expandedGrid[i][j] = { ...game.grid[i][j] };
          }
        }

        // mark tile used for expansion
        expandedGrid[x][y] = {
          ...tile,
          upgrade: UPGRADE_TYPES.EXPAND,
          expansionUsed: true,
        };

        return {
          ...game,
          gridSize: newGridSize,
          grid: expandedGrid,
          seeds: game.seeds - game.expansionCost,
          expansionCost: game.expansionCost + 2,
          food: game.food + 1,
        };
      }
      return game;
    }

    /* -------------------------------------------------------------- */
    default:
      return game;
  }
}