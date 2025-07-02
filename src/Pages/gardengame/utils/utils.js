const expandGrassFrom = (map, centerX, centerY, radius) => {
  const newMap = map.map((row) => [...row]); // Deep copy
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (
        x >= 0 &&
        x < MAP_WIDTH &&
        y >= 0 &&
        y < MAP_HEIGHT &&
        Math.abs(dx) + Math.abs(dy) <= radius
      ) {
        newMap[y][x] = "grass";
      }
    }
  }
  return newMap;
};