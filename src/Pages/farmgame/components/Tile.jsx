import React, { useRef } from "react";
import { TILE_TYPES, UPGRADE_TYPES } from "../gameEngine";

// Global flag so dragging continues across tiles
let isPointerDownGlobal = false;

export default function Tile({
  i,
  j,
  tile,
  isSelected,
  hasBug,
  tileSize,
  onStartDrag,   // (x, y)
  onDuringDrag,  // (x, y)
  onEndDrag,     // ()
  onClick,       // (x, y, requestModal?)
}) {
  const tileRef = useRef(null);

  // Track gesture state for tap vs drag
  const startXYRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const startedDragRef = useRef(false);
  const pointerIdRef = useRef(null);

  const DRAG_THRESHOLD_PX = 6; // small but avoids accidental drags

  const handlePointerDown = (e) => {
    e.preventDefault();
    isPointerDownGlobal = true;
    movedRef.current = false;
    startedDragRef.current = false;
    pointerIdRef.current = e.pointerId;
    startXYRef.current = { x: e.clientX, y: e.clientY };

    // Capture so we keep getting events even if finger moves fast
    e.currentTarget.setPointerCapture?.(e.pointerId);
    // Do NOT call onStartDrag yet—wait until movement exceeds threshold
  };

  const maybeStartDrag = () => {
    if (!startedDragRef.current) {
      startedDragRef.current = true;
      onStartDrag?.(i, j);
      // Immediately include the current tile in the drag selection
      onDuringDrag?.(i, j);
    }
  };

  const handlePointerMove = (e) => {
    if (!isPointerDownGlobal) return;

    const dx = e.clientX - startXYRef.current.x;
    const dy = e.clientY - startXYRef.current.y;
    const dist2 = dx * dx + dy * dy;
    if (dist2 > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
      movedRef.current = true;
      // Once we’re over threshold, begin selection if not already
      maybeStartDrag();
    }
  };

  const handlePointerEnter = () => {
    if (!isPointerDownGlobal) return;
    // If we’re already dragging, keep selecting as we enter new tiles
    if (movedRef.current) {
      maybeStartDrag();
      onDuringDrag?.(i, j);
    }
  };

  const endDragIfNeeded = () => {
    if (startedDragRef.current) {
      onEndDrag?.();
    }
    startedDragRef.current = false;
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (!isPointerDownGlobal) return;

    // Release capture if we had it
    if (pointerIdRef.current != null) {
      e.currentTarget.releasePointerCapture?.(pointerIdRef.current);
      pointerIdRef.current = null;
    }

    // If we didn't move → treat as a click (bug squash > harvest > modal)
    if (!movedRef.current) {
      handleClick();
    } else {
      // Finished a drag gesture
      endDragIfNeeded();
    }

    isPointerDownGlobal = false;
  };

  const handlePointerCancel = () => {
    if (isPointerDownGlobal) {
      endDragIfNeeded();
      isPointerDownGlobal = false;
    }
  };

  const handleClick = () => {
    // Prioritize bug squashing
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
            <span className="text-gray-900">⏳ {remaining}s</span>
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
          <span className="text-gray-900">Dirt</span>
          {tile.upgrade === UPGRADE_TYPES.WATER && (
            <div className="text-blue-600 text-xs font-semibold">💧 Water</div>
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
        {isTrulyEmpty && <span className="text-gray-800">empty</span>}
        {tile.upgrade === UPGRADE_TYPES.WATER && (
          <div className="text-blue-600 text-xs font-semibold">💧 Water</div>
        )}
        {tile.upgrade === UPGRADE_TYPES.HYDRO && (
          <div className="text-purple-600 text-xs font-semibold">Hydro</div>
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

      // Unified pointer events (mouse + touch)
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}

      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
      style={{
        width: `${tileSize}px`,
        height: `${tileSize}px`,
        fontSize: `${tileSize < 40 ? 9 : 11}px`,
        padding: "2px",
        touchAction: "none",   // critical for mobile drag
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
