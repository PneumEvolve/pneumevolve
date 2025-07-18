import React from "react";

export default function GameOverlay({
  water,
  seeds,
  food,
  score,
  time,
  winTime,
  showWinModal,
  onSaveScore,
  onCloseWinModal,
  onAddWater,
}) {
  return (
    <>
      <div className="fixed top-2 left-2 bg-white bg-opacity-80 p-2 rounded shadow z-20 text-sm">
        <p>💧 Water: {water}</p>
        <p>🌱 Seeds: {seeds}</p>
        <p>🍽️ Food: {food}</p>
        <p>🏆 Score: {score}</p>
        <p>⏱️ Time: {time}s</p>
        <button
  onClick={() => onAddWater?.()}
  className="mt-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
>
  Generate 💧 Water
</button>
      </div>

      {showWinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center space-y-4 max-w-xs w-full">
            <h2 className="text-xl font-bold">🎉 You Win!</h2>
            <p>Final Time: {winTime}s</p>
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
    </>
  );
}