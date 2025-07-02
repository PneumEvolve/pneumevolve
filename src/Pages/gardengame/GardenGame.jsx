import React from "react";
import MapRenderer from "./MapRenderer.jsx";

export default function GardenGame() {
  return (
    <div className="w-full h-screen bg-black text-white flex flex-col items-center justify-center">
      <h1 className="text-xl font-bold mb-4">🌿 Garden Game</h1>
      <MapRenderer />
    </div>
  );
}