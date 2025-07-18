// gameEngine.js

export const GRID_SIZE = 2;

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

export const createGameState = () => ({
  water: 0,
  seeds: 1,
  food: 0,
  bonusWater: 0,
  hydroponics: false, // legacy flag, not used
  gridSize: GRID_SIZE,
  grid: Array(GRID_SIZE)
    .fill()
    .map(() =>
      Array(GRID_SIZE).fill({ type: "empty", growth: 0, upgrade: null })
    ),
  tickCount: 0,
  expansionCost: 5,
  bugs: [], // 🐛 bugs flying around
});

export function tick(state) {
  let { water, seeds, grid } = state;

  let plantedCount = 0;
  let hydroDrain = 0;

  // Update plant growth
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const tile = grid[i][j];

      // 🐛 Check for bugs on this tile
      const bugHere = state.bugs.some((b) => b.x === i && b.y === j);
      if (tile.type === TILE_TYPES.PLANTED) {
        if (bugHere) {
          tile.hasWater = false;
          continue; // Skip growth if bug is on tile
        }

        const isHydro = tile.upgrade === UPGRADE_TYPES.HYDRO;
        const drain = isHydro ? 3 : 1;

        if (water >= drain) {
          water -= drain;
          tile.growth += 1;
          tile.hasWater = true;
        } else {
          tile.hasWater = false;
        }

        plantedCount++;
        if (isHydro) hydroDrain++;
      }
    }
  }

  // Add passive water
  water += 1 + state.bonusWater;

  // 🐛 BUG LOGIC: spawn every 5 ticks
  if (state.tickCount % 10 === 0) {
    const plantedTiles = [];

    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        const tile = grid[i][j];
        if (
          tile.type === TILE_TYPES.PLANTED &&
          tile.upgrade !== UPGRADE_TYPES.HYDRO
        ) {
          plantedTiles.push({ x: i, y: j });
        }
      }
    }

    if (plantedTiles.length > 0 && state.bugs.length < 5) {
      const spawn = plantedTiles[Math.floor(Math.random() * plantedTiles.length)];
      state.bugs.push({ x: spawn.x, y: spawn.y, age: 0 });
    }
  }

  // 🐛 Update bug lifespan
  const updatedBugs = [];
  for (const bug of state.bugs) {
    bug.age += 1;
    if (bug.age < 10) {
      updatedBugs.push(bug);
    }
  }

  state.bugs = updatedBugs;
  state.tickCount++;

  return {
    ...state,
    water,
    grid,
    plantedCount,
    hydroCount: hydroDrain,
  };
}

export function performAction(state, action, x, y) {
  const tile = state.grid[x][y];
  const newGrid = state.grid.map((row) => [...row]);

  switch (action) {
  case "plant":
    return performAction(state, "plantSeed", x, y); // ✅ Alias fix
    
    case "addDirt":

  if (tile.type === "empty" && !tile.upgrade) {
    newGrid[x][y] = {
      ...tile,
      type: "dirt",
    };
    return { ...state, grid: newGrid };
  }
  break;

    case "plantSeed": {
  const tile = state.grid[x][y];

  const growTime = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
  const isHarvestable =
    tile.type === "planted" && tile.growth >= growTime;

  // ❌ Prevent planting on fully grown crops
  if (isHarvestable) return state;

  if (
    (tile.type === "dirt" || tile.upgrade === UPGRADE_TYPES.HYDRO) &&
    state.seeds >= 1 &&
    tile.type !== "planted"
  ) {
    const newGrid = [...state.grid];
    newGrid[x][y] = {
      ...tile,
      type: "planted",
      growth: 0,
      upgrade: tile.upgrade,
    };
    return { ...state, grid: newGrid, seeds: state.seeds - 1 };
  }
  break;
}

    case "harvest": {
  const growLimit = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
  if (tile.type === "planted" && tile.growth >= growLimit) {
    const newType =
      tile.upgrade === UPGRADE_TYPES.HYDRO ? TILE_TYPES.EMPTY : TILE_TYPES.DIRT;

    newGrid[x][y] = {
      ...tile,
      type: newType,
      growth: 0,
      // 🛠 Keep upgrade unchanged
      upgrade: tile.upgrade,
    };

    return {
      ...state,
      grid: newGrid,
      seeds: state.seeds + 2,
      food: state.food + 1,
    };
  }
  break;
}

    case "removeDirt":
      if (
        (tile.type === "dirt" || tile.type === "planted") &&
        state.seeds >= 1
      ) {
        newGrid[x][y] = { type: "empty", growth: 0, upgrade: null };
        return { ...state, grid: newGrid, seeds: state.seeds - 1 };
      }
      break;

    case "upgradeWater":
      if (tile.type === "empty" && !tile.upgrade && state.seeds >= 2) {
        newGrid[x][y] = { ...tile, upgrade: UPGRADE_TYPES.WATER };
        return {
          ...state,
          grid: newGrid,
          seeds: state.seeds - 2,
          bonusWater: state.bonusWater + 2,
        };
      }
      break;

    case "upgradeHydro":
      if (
        tile.type === "empty" &&
        !tile.upgrade &&
        state.seeds >= 2 &&
        state.water >= 50
      ) {
        newGrid[x][y] = { ...tile, upgrade: UPGRADE_TYPES.HYDRO };
        return {
          ...state,
          grid: newGrid,
          seeds: state.seeds - 2,
          water: state.water - 50,
        };
      }
      break;

    case "upgradeExpand":
      if (
        tile.type === "empty" &&
        !tile.upgrade &&
        state.seeds >= state.expansionCost
      ) {
        const newGridSize = state.gridSize + 1;

        const oldGrid = state.grid;
        const expandedGrid = Array(newGridSize)
          .fill()
          .map((_, i) =>
            Array(newGridSize)
              .fill()
              .map((_, j) =>
                oldGrid[i]?.[j] ?? {
                  type: "empty",
                  growth: 0,
                  upgrade: null,
                }
              )
          );

        expandedGrid[x][y] = {
          ...tile,
          upgrade: UPGRADE_TYPES.EXPAND,
          expansionUsed: true,
        };

        return {
          ...state,
          gridSize: newGridSize,
          grid: expandedGrid,
          seeds: state.seeds - state.expansionCost,
          expansionCost: state.expansionCost + 2,
          food: (state.food || 0) + 1,
        };
      }
      break;

    case "squashBug":
      state.bugs = state.bugs.filter((b) => !(b.x === x && b.y === y));
      return { ...state };

    default:
      break;
  }

  return { ...state, grid: newGrid };
}