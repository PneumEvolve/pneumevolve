// gameEngine.js
export const GRID_SIZE = 2;

export const TILE_TYPES = {
  EMPTY: "empty",
  DIRT: "dirt",
  PLANTED: "planted",
};

export const createGameState = () => ({
  water: 0,
  seeds: 1,
  bonusWater: 0,
  hydroponics: false, // Legacy global flag, kept for compatibility
  gridSize: 2,
  grid: Array(2).fill().map(() =>
    Array(2).fill({ type: "empty", growth: 0, upgrade: null })
  ),
  tickCount: 0,
  expansionCost: 5,
});

export function tick(state) {
  let { water, seeds, grid } = state;

  let plantedCount = 0;
  let hydroDrain = 0;

  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const tile = grid[i][j];

      if (tile.type === TILE_TYPES.PLANTED) {
        // Determine drain amount
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

        if (isHydro) {
          hydroDrain += 1; // Count how many hydro plants for display
        }
      }
    }
  }

  water += 1 + state.bonusWater;

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
    case "addDirt":
      if (tile.type === "empty" && !tile.upgrade)
        newGrid[x][y] = { ...tile, type: "dirt", growth: 0 };
      break;
    case "plantSeed":
      if ((tile.type === "dirt" || tile.upgrade === UPGRADE_TYPES.HYDRO) && state.seeds > 0) {
        newGrid[x][y] = { ...tile, type: "planted", growth: 0, upgrade: tile.upgrade };
        return { ...state, grid: newGrid, seeds: state.seeds - 1 };
      }
      break;
    case "harvest":
      const growLimit = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
      if (tile.type === "planted" && tile.growth >= growLimit) {
        newGrid[x][y] = { ...tile, type: "dirt", growth: 0, upgrade: tile.upgrade };
        return { ...state, grid: newGrid, seeds: state.seeds + 2 };
      }
      break;
    case "removeDirt":
      if ((tile.type === "dirt" || tile.type === "planted") && state.seeds >= 1) {
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
  if (state.seeds >= 3 && state.water >= 50 && !tile.upgrade) {
    tile.upgrade = UPGRADE_TYPES.HYDRO;
    state.seeds -= 3;
    state.water -= 50;
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
                oldGrid[i]?.[j] ?? { type: "empty", growth: 0, upgrade: null }
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
        };
      }
      break;
  }

  return { ...state, grid: newGrid };
}

export const UPGRADE_TYPES = {
  WATER: "waterUpgrade",
  HYDRO: "hydro",
  EXPAND: "expand",
};
