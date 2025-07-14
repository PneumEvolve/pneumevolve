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
  hydroponics: false,
  gridSize: 2,
  grid: Array(2).fill().map(() =>
    Array(2).fill({ type: "empty", growth: 0, upgrade: null })
  ),
  tickCount: 0,
  expansionCost: 5,
});

export function tick(state) {
  const { bonusWater, hydroponics } = state;
  const plantedTiles = state.grid.flat().filter((t) => t.type === "planted");
  const plantedCount = plantedTiles.length;
  const growthTime = hydroponics ? 15 : 30;

  const waterGain = 1 + bonusWater
  const projectedWater = state.water + waterGain;

  const canFeedAllPlants = projectedWater >= plantedCount && plantedCount > 0;

  const waterAfterGrowth = canFeedAllPlants ? projectedWater - plantedCount : projectedWater;

  // Only grow if there’s enough water for ALL plants
  const newGrid = state.grid.map((row) =>
    row.map((tile) => {
      if (
        tile.type === "planted" &&
        tile.growth < growthTime &&
        canFeedAllPlants
      ) {
        return { ...tile, growth: tile.growth + 1 };
      }
      return tile;
    })
  );

  return {
    ...state,
    grid: newGrid,
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
      if (tile.type === "empty") newGrid[x][y] = { ...tile, type: "dirt", growth: 0 };
      break;
    case "plantSeed":
      if (tile.type === "dirt" && state.seeds > 0) {
        newGrid[x][y] = { ...tile, type: "planted", growth: 0 };
        return { ...state, grid: newGrid, seeds: state.seeds - 1 };
      }
      break;
    case "harvest":
      if (tile.type === "planted" && tile.growth >= (state.hydroponics ? 15 : 30)) {
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
        newGrid[x][y] = { ...tile, upgrade: "waterUpgrade" };
        return { ...state, grid: newGrid, seeds: state.seeds - 2, bonusWater: state.bonusWater + 2 };
      }
      break;
    case "upgradeHydro":
      if (tile.type === "empty" && !tile.upgrade && state.seeds >= 5) {
        newGrid[x][y] = { ...tile, upgrade: "hydro" };
        return { ...state, grid: newGrid, seeds: state.seeds - 5, hydroponics: true };
      }
      break;
    case "upgradeExpand":
      if (
        tile.type === "empty" &&
        !tile.upgrade &&
        state.seeds >= state.expansionCost
      ) {
        const newGridSize = state.gridSize + 1;

        // Expand the existing grid
        const oldGrid = state.grid;
        const newGrid = Array.from({ length: newGridSize }, (_, i) =>
  Array.from({ length: newGridSize }, (_, j) =>
    oldGrid[i]?.[j] ?? { type: "empty", growth: 0, upgrade: null }
  )
);

        newGrid[x][y] = {
          ...tile,
          upgrade: "expand",
        };

        return {
          ...state,
          gridSize: newGridSize,
          grid: newGrid,
          seeds: state.seeds - state.expansionCost,
          expansionCost: state.expansionCost + 2, // 🧠 increase cost
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
