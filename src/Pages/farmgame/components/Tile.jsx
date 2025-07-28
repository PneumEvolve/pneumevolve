import React, { useEffect, useRef } from "react";
import { TILE_TYPES, UPGRADE_TYPES } from "../gameEngine";

export default function Tile({
  i,
  j,
  tile,
  isSelected,
  hasBug,
  tileSize,
  onStartDrag,
  onDuringDrag,
  onEndDrag,
  onClick,
}) {
  const tileRef = useRef(null);
  const touchMovedRef = useRef(false);

  useEffect(() => {
    const tileEl = tileRef.current;
    if (!tileEl) return;

    const handleTouchStart = (e) => {
      e.preventDefault();
      touchMovedRef.current = false;
      onStartDrag?.(i, j);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      touchMovedRef.current = true;
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target?.dataset?.tile) {
        const [x, y] = target.dataset.tile.split(",").map(Number);
        onDuringDrag?.(x, y);
      }
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      onEndDrag?.();
      if (!touchMovedRef.current) handleClick();
    };

    tileEl.addEventListener("touchstart", handleTouchStart, { passive: false });
    tileEl.addEventListener("touchmove", handleTouchMove, { passive: false });
    tileEl.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      tileEl.removeEventListener("touchstart", handleTouchStart);
      tileEl.removeEventListener("touchmove", handleTouchMove);
      tileEl.removeEventListener("touchend", handleTouchEnd);
    };
  }, [i, j, onStartDrag, onDuringDrag, onEndDrag]);

  const handleMouseEnter = () => {
    onDuringDrag?.(i, j);
  };

  const handleClick = () => {
    if (hasBug) return onClick?.(i, j);

    const growTime = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
    const isHarvestable = tile.type === TILE_TYPES.PLANTED && tile.growth >= growTime;

    if (isHarvestable) {
      onClick?.(i, j);
    } else {
      onClick?.(i, j, true); // open modal
    }
  };

  const renderContent = () => {
    const bugEmoji = hasBug ? "🐛" : "";

    if (tile.type === TILE_TYPES.PLANTED) {
      const growTime = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
      const remaining = growTime - tile.growth;

      return (
  <div className="flex flex-col items-center text-xs space-y-1">
    {remaining <= 0 ? (
      <span className="text-green-600 font-bold animate-bounce">✅ Grown</span>
    ) : (
      <span className="text-gray-700">⏳ {remaining}s</span>
    )}

    {tile.upgrade === UPGRADE_TYPES.HYDRO && (
      <span className="text-purple-600 bg-purple-100 px-1 rounded">Hydro</span>
    )}

    {bugEmoji && (
      <span className="text-red-500 text-lg">{bugEmoji}</span>
    )}
  </div>
);
    }

    if (tile.type === TILE_TYPES.DIRT) {
      return (
        <>
          <span>Dirt</span>
          {tile.upgrade === UPGRADE_TYPES.WATER && (
            <div className="text-blue-500 text-xs font-semibold">💧 Water</div>
          )}
          {tile.upgrade === UPGRADE_TYPES.EXPAND && (
            <div className="text-green-700 text-xs font-semibold">🪴 Expand</div>
          )}
          {bugEmoji && <div className="text-red-500 text-sm">{bugEmoji}</div>}
        </>
      );
    }

    const isTrulyEmpty = !tile.type && !tile.upgrade;

    return (
      <>
        {isTrulyEmpty && <span>empty</span>}
        {tile.upgrade === UPGRADE_TYPES.WATER && (
          <div className="text-blue-500 text-xs font-semibold">💧 Water</div>
        )}
        {tile.upgrade === UPGRADE_TYPES.HYDRO && (
          <div className="text-purple-500 text-xs font-semibold">Hydro</div>
        )}
        {tile.upgrade === UPGRADE_TYPES.EXPAND && (
          <div className="text-green-700 text-xs font-semibold">🪴 Expand</div>
        )}
        {bugEmoji && <div className="text-red-500 text-sm">{bugEmoji}</div>}
      </>
    );
  };

  return (
    <div
      ref={tileRef}
      data-tile={`${i},${j}`}
      onClick={handleClick}
      onMouseDown={() => onStartDrag?.(i, j)}
      onMouseEnter={handleMouseEnter}
      onMouseUp={() => onEndDrag?.()}
      draggable={false}
      style={{
        width: `${tileSize}px`,
        height: `${tileSize}px`,
        fontSize: `${tileSize < 40 ? 9 : 11}px`,
        padding: "2px",
        backgroundColor: hasBug
          ? "#fee2e2"
          : isSelected
          ? "#bfdbfe"
          : tile.type === TILE_TYPES.DIRT
          ? "#fef3c7"
          : "white",
        border: isSelected ? "2px solid #3b82f6" : "1px solid #ccc",
      }}
      className={`flex flex-col items-center justify-center text-center select-none ${
        hasBug ? "animate-pulse" : ""
      }`}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {tile.justGrown && (
          <div className="absolute inset-0 flex items-center justify-center text-green-500 text-lg font-bold animate-ping z-10">
            Grown
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
}