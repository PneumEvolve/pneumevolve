import React, { useRef } from "react";
import { TILE_TYPES, UPGRADE_TYPES } from "../gameEngine";

// Shared flag so dragging works across tiles on mobile & desktop
let isPointerDownGlobal = false;

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

  const handlePointerDown = (e) => {
    // Prevent page scroll/zoom and text selection during drag-start
    e.preventDefault();
    isPointerDownGlobal = true;
    onStartDrag?.(i, j);
  };

  const handlePointerEnter = () => {
    if (!isPointerDownGlobal) return;
    onDuringDrag?.(i, j);
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (isPointerDownGlobal) {
      isPointerDownGlobal = false;
      onEndDrag?.();
    }
  };

  const handlePointerCancel = () => {
    if (isPointerDownGlobal) {
      isPointerDownGlobal = false;
      onEndDrag?.();
    }
  };

  const handleClick = () => {
    // Prioritize bug squash
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

          {bugEmoji && <span className="text-red-500 text-lg">{bugEmoji}</span>}
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

      // Pointer Events (covers mouse + touch)
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}

      // Prevent long-press context menu on mobile
      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
      style={{
        width: `${tileSize}px`,
        height: `${tileSize}px`,
        fontSize: `${tileSize < 40 ? 9 : 11}px`,
        padding: "2px",
        touchAction: "none", // critical for mobile drag/selection
        userSelect: "none",
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