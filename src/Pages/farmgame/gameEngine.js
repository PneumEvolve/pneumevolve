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
  const { bonusWater } = state;
  let waterDrain = 0;

  // Step 1: Calculate water cost and grow eligible plants
  const newGrid = state.grid.map((row, x) =>
    row.map((tile, y) => {
      let updatedTile = { ...tile };

      if (tile.type === TILE_TYPES.PLANTED) {
        const hasHydro = tile.upgrade === UPGRADE_TYPES.HYDRO;
        const maxGrowth = hasHydro ? 10 : 20;

        waterDrain += 1; // base cost
        if (hasHydro) waterDrain += 1; // extra cost

        // Will only grow if total water is sufficient for all
        if (tile.growth < maxGrowth) {
          updatedTile._canGrow = true; // mark for second pass
        }
      }

      return updatedTile;
    })
  );

  const waterGain = 1 + bonusWater;
  const projectedWater = state.water + waterGain;
  const canFeedAllPlants = projectedWater >= waterDrain && waterDrain > 0;
  const waterAfterGrowth = canFeedAllPlants ? projectedWater - waterDrain : projectedWater;

  // Step 2: Actually grow plants
  const finalGrid = newGrid.map((row) =>
    row.map((tile) => {
      if (tile._canGrow && canFeedAllPlants) {
        return { ...tile, growth: tile.growth + 1 };
      }
      return tile;
    })
  );

  const plantedCount = finalGrid.flat().filter((t) => t.type === TILE_TYPES.PLANTED).length;

  return {
    ...state,
    grid: finalGrid,
    water: waterAfterGrowth,
    tickCount: state.tickCount + 1,
    plantedCount,
    effectiveWaterRate: waterGain,
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
      if (tile.type === "dirt" && state.seeds > 0) {
        newGrid[x][y] = { ...tile, type: "planted", growth: 0 };
        return { ...state, grid: newGrid, seeds: state.seeds - 1 };
      }
      break;
    case "harvest":
      const growLimit = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
      if (tile.type === "planted" && tile.growth >= growLimit) {
        newGrid[x][y] = { ...tile, type: "dirt", growth: 0 };
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
      if (tile.type === "empty" && !tile.upgrade && state.seeds >= 5) {
        newGrid[x][y] = { ...tile, upgrade: UPGRADE_TYPES.HYDRO };
        return {
          ...state,
          grid: newGrid,
          seeds: state.seeds - 5,
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