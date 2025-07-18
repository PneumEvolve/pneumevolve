import React from "react";

export default function GameHeader({
  game,
  elapsedTime,
  onAddWater,
  onSaveScore,
  onCloseWinModal,
  isPaused,
  onTogglePause,
}) {
  const best = JSON.parse(localStorage.getItem("farmgame_best") || "{}");

   const baseRate = 1;
      const totalRate =
        baseRate +
        game.bonusWater -
       (game.plantedCount - game.hydroCount) -
        game.hydroCount * 3;

  return (
    <div className="relative w-full flex flex-col items-center space-y-3 text-sm sm:text-base">
      {/* Top Stats Row */}
      <div className="flex flex-wrap justify-center gap-3 bg-white bg-opacity-80 p-2 rounded shadow text-gray-800 w-full max-w-lg">
        <p>🍽️ Food: {game.food}</p>
        <p>🏆 Score: {game.score}</p>
        <p>⏱️ Time: {elapsedTime}s</p>
        {best?.time && (
          <p>
            🥇 Best: {best.time}s
          </p>
        )}
      </div>

      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-bold text-blue-700">💧 Water Garden</h2>
      {/* Pause/Resume Button */}
{onTogglePause && (
  <button
    onClick={onTogglePause}
    className={`px-3 py-1 rounded text-white text-sm ${
      isPaused
        ? "bg-green-600 hover:bg-green-700"
        : "bg-gray-600 hover:bg-gray-700"
    }`}
  >
    {isPaused ? "Resume" : "Pause"}
  </button>
)}

      {/* Water Button */}
      <button
        onClick={() => onAddWater?.()}
        className="touch-manipulation px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
      >
        + 💧 Generate Water
      </button>

      {/* Water and Seeds Only */}
     
      <div className="flex gap-4 text-gray-800 bg-white bg-opacity-80 p-2 rounded shadow">
        <p>
  💧 Water: {game.water}{" "}
  <span className="text-xs text-gray-500">({totalRate}/sec)</span>
</p>
        <p>🌱 Seeds(100 to Win): {game.seeds}</p>
      </div>

      {/* Win Modal */}
      {game.showWinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center space-y-4 max-w-xs w-full">
            <h2 className="text-xl font-bold">🎉 You Win!</h2>
            <p>Final Time: {game.winTime}s</p>
            <button
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              onClick={onSaveScore}
            >
              Save Score & Keep Playing
            </button>
            <button
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              onClick={onCloseWinModal}
            >
              Keep Playing Without Saving
            </button>
          </div>
        </div>
      )}
    </div>
  );
}