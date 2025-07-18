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

  // Attach touch listeners manually
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
  // Only treat it as a tap if no move occurred
  if (!touchMovedRef.current) {
    handleClick(); // Simulate a click
  }
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

  const renderContent = () => {
    const bugEmoji = hasBug ? "🐛" : "";

    if (tile.type === TILE_TYPES.PLANTED) {
      const growTime = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
      const remaining = growTime - tile.growth;

      return (
        <>
          {remaining <= 0 ? (
            <span className="text-green-600 font-bold animate-bounce">Grown ✅</span>
          ) : (
            <span>Growing: {remaining}s</span>
          )}
          {tile.upgrade === UPGRADE_TYPES.HYDRO && (
            <div className="text-purple-500 text-xs font-semibold">Hydro</div>
          )}
          {bugEmoji && <div className="text-red-500 text-sm">{bugEmoji}</div>}
        </>
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
        {isTrulyEmpty ? <span>empty</span> : null}
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

  const handleClick = () => {
  if (hasBug) {
  onClick?.(i, j);
  return;
}

  const growTime = tile.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
  const isHarvestable =
    tile.type === TILE_TYPES.PLANTED && tile.growth >= growTime;

  if (isHarvestable) {
  onClick?.(i, j); // Pass coordinates so handleTileClick(x, y) works
} else {
    onClick?.(i, j, true); // true = request modal
  }
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
      {renderContent()}
    </div>
  );
}