// src/Pages/SheasGame.jsx
import React, { useEffect, useRef, useState } from "react";

const TILE_SIZE = 32;
const WIDTH = 20;
const HEIGHT = 15;
const MAX_PORTALS = 3;
const ENEMY_COUNT = 5;

export default function SheasGame() {
  const canvasRef = useRef(null);
  const [player, setPlayer] = useState({ x: 10, y: 7, color: "cyan" });
  const [enemies, setEnemies] = useState(
    Array.from({ length: ENEMY_COUNT }, () => ({
      x: Math.floor(Math.random() * WIDTH),
      y: Math.floor(Math.random() * HEIGHT),
      color: "red",
    }))
  );
  const [portals, setPortals] = useState([]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("Welcome to ChaosLand!");

  const handleKeyDown = (e) => {
    let dx = 0,
      dy = 0;
    if (e.key === "ArrowUp" || e.key === "w") dy = -1;
    else if (e.key === "ArrowDown" || e.key === "s") dy = 1;
    else if (e.key === "ArrowLeft" || e.key === "a") dx = -1;
    else if (e.key === "ArrowRight" || e.key === "d") dx = 1;
    else if (e.key === " ") placePortal();

    const newX = Math.max(0, Math.min(WIDTH - 1, player.x + dx));
    const newY = Math.max(0, Math.min(HEIGHT - 1, player.y + dy));
    setPlayer((prev) => ({ ...prev, x: newX, y: newY }));

    portals.forEach((p) => {
      if (p.x === newX && p.y === newY) {
        const randomX = Math.floor(Math.random() * WIDTH);
        const randomY = Math.floor(Math.random() * HEIGHT);
        setPlayer((prev) => ({ ...prev, x: randomX, y: randomY }));
        setMessage("💫 Teleported!");
      }
    });
  };

  const placePortal = () => {
    if (portals.length >= MAX_PORTALS) return;
    setPortals((prev) => [...prev, { x: player.x, y: player.y }]);
    setMessage("🌀 Portal created!");
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        ctx.strokeStyle = "#333";
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    portals.forEach((p) => {
      ctx.fillStyle = "purple";
      ctx.beginPath();
      ctx.arc(
        p.x * TILE_SIZE + TILE_SIZE / 2,
        p.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE / 2 - 2,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });

    enemies.forEach((enemy) => {
      ctx.fillStyle = enemy.color;
      ctx.fillRect(
        enemy.x * TILE_SIZE,
        enemy.y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    });

    ctx.fillStyle = player.color;
    ctx.fillRect(
      player.x * TILE_SIZE,
      player.y * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE
    );
  };

  const updateEnemies = () => {
    setEnemies((prev) =>
      prev.map((e) => {
        let dx = Math.sign(player.x - e.x);
        let dy = Math.sign(player.y - e.y);
        return {
          ...e,
          x: Math.max(0, Math.min(WIDTH - 1, e.x + dx)),
          y: Math.max(0, Math.min(HEIGHT - 1, e.y + dy)),
        };
      })
    );
  };

  useEffect(() => {
    draw();
  }, [player, enemies, portals]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      updateEnemies();
      setScore((s) => s + 1);
      setMessage(`Score: ${score}`);
    }, 500);
    return () => clearInterval(interval);
  }, [score]);

  useEffect(() => {
    enemies.forEach((e) => {
      if (e.x === player.x && e.y === player.y) {
        setMessage("☠️ Caught! Game Over.");
        setPlayer((prev) => ({ ...prev, color: "gray" }));
      }
    });
  }, [enemies]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-2xl mb-4 font-bold">🌪 SheasGame: CHAOSLAND 🌪</h1>
      <canvas
        ref={canvasRef}
        width={WIDTH * TILE_SIZE}
        height={HEIGHT * TILE_SIZE}
        className="border-2 border-white"
      />
      <p className="mt-4">{message}</p>
      <p className="text-sm text-gray-400">WASD or Arrows to Move, Space to place Portal</p>
    </div>
  );
}