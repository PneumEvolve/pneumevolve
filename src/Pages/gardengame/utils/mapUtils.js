// src/Pages/gardengame/utils/mapUtils.js
import { MAP_WIDTH, MAP_HEIGHT } from "../config";

export const createInitialMap = () => {
  return Array.from({ length: MAP_HEIGHT }, () =>
    Array.from({ length: MAP_WIDTH }, () => "dirt")
  );
};

export const getGreenPercent = (map) => {
  let green = 0, total = 0;
  map.forEach((row) => {
    row.forEach((tile) => {
      if (tile === "grass") green++;
      total++;
    });
  });
  return (green / total) * 100;
};