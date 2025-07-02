// src/Pages/gardengame/utils/drawUtils.js
import { TILE_SIZE } from "../config";

export const drawCanvas = (canvasRef, map, player, plants, projectiles, enemies, seedPickups) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  canvas.width = map[0].length * TILE_SIZE;
  canvas.height = map.length * TILE_SIZE;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw tiles
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[0].length; x++) {
      ctx.fillStyle = map[y][x] === "grass" ? "#6fcf97" : "#8d6e63"; // green or brown
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // Draw seed pickups
  seedPickups.forEach(({ x, y }) => {
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(
      x * TILE_SIZE + TILE_SIZE / 2,
      y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE / 4,
      0,
      Math.PI * 2
    );
    ctx.fill();
  });

  // Draw plants
  plants.forEach((p) => {
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(p.x * TILE_SIZE, p.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  });

  // Draw enemies
  enemies.forEach((e) => {
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(e.x * TILE_SIZE, e.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  });

  // Draw projectiles
  projectiles.forEach((proj) => {
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(
      proj.x * TILE_SIZE + TILE_SIZE / 2,
      proj.y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE / 4,
      0,
      Math.PI * 2
    );
    ctx.fill();
  });

  // Draw player
  ctx.fillStyle = "#3498db";
  ctx.fillRect(player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
};
