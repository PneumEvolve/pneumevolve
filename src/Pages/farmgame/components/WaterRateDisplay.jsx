import React from "react";

export default function WaterRateDisplay({ game }) {
  const baseRate = 1;
  const totalRate =
    baseRate +
    game.bonusWater -
    (game.plantedCount - game.hydroCount) -
    game.hydroCount * 3;

  return (
    <p className="text-gray-600 text-center">
      Water Rate: {baseRate} + {game.bonusWater} − ({game.plantedCount - game.hydroCount} × 1) − ({game.hydroCount} × 3) =
      <strong> {totalRate}</strong>/sec
    </p>
  );
}