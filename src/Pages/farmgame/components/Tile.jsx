import React, { useEffect, useRef } from "react";
import { TILE_TYPES, UPGRADE_TYPES } from "../gameEngine";

// Single active pointer to avoid multi-touch conflicts
let activePointerId = null;

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

  // Gesture state refs
  const startXYRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const startedDragRef = useRef(false);

  const DRAG_THRESHOLD_PX = 6;

  // ---- Helpers ----
  const beginDragIfNeeded = () => {
    if (!startedDragRef.current) {
      startedDragRef.current = true;
      onStartDrag?.(i, j);      // seed selection with where the gesture began
      onDuringDrag?.(i, j);
    }
  };

  const selectTileUnderPoint = (clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return;

    // Walk up until we find a node with data-tile
    let node = el;
    while (node && node !== document.body) {
      const ds = node.dataset;
      if (ds && ds.tile) {
        const [tx, ty] = ds.tile.split(",").map(Number);
        onDuringDrag?.(tx, ty);
        return;
      }
      node = node.parentElement;
    }
  };

  const endDragIfNeeded = () => {
    if (startedDragRef.current) {
      onEndDrag?.();
    }
    startedDragRef.current = false;
    movedRef.current = false;
  };

  // ---- Document-level handlers to keep tracking across tiles ----
  const handleDocPointerMove = (e) => {
    if (e.pointerId !== activePointerId) return;

    // Stop page scroll/zoom while dragging
    e.preventDefault();

    const dx = e.clientX - startXYRef.current.x;
    const dy = e.clientY - startXYRef.current.y;
    const dist2 = dx * dx + dy * dy;

    if (dist2 > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
      movedRef.current = true;
      beginDragIfNeeded();
      // Continuously pick the tile under the finger
      selectTileUnderPoint(e.clientX, e.clientY);
    }
  };

  const handleDocPointerUp = (e) => {
    if (e.pointerId !== activePointerId) return;

    e.preventDefault();

    if (!movedRef.current) {
      // Treat as a tap/click
      handleClick();
    } else {
      // Finish drag selection
      endDragIfNeeded();
    }

    activePointerId = null;
    // Remove global listeners
    window.removeEventListener("pointermove", handleDocPointerMove, { passive: false });
    window.removeEventListener("pointerup", handleDocPointerUp, { passive: false });
    window.removeEventListener("pointercancel", handleDocPointerCancel, { passive: false });
  };

  const handleDocPointerCancel = (e) => {
    if (e.pointerId !== activePointerId) return;
    endDragIfNeeded();
    activePointerId = null;
    window.removeEventListener("pointermove", handleDocPointerMove, { passive: false });
    window.removeEventListener("pointerup", handleDocPointerUp, { passive: false });
    window.removeEventListener("pointercancel", handleDocPointerCancel, { passive: false });
  };

  useEffect(() => {
    // Cleanup on unmount in case a gesture is mid-flight
    return () => {
      if (activePointerId !== null) {
        activePointerId = null;
        window.removeEventListener("pointermove", handleDocPointerMove, { passive: false });
        window.removeEventListener("pointerup", handleDocPointerUp, { passive: false });
        window.removeEventListener("pointercancel", handleDocPointerCancel, { passive: false });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Element-level handlers ----
  const handlePointerDown = (e) => {
    // Only start if no other pointer is active (ignore extra fingers)
    if (activePointerId !== null) return;

    // Prevent default to stop scrolling/zoom on mobile
    e.preventDefault();

    activePointerId = e.pointerId;
    movedRef.current = false;
    startedDragRef.current = false;
    startXYRef.current = { x: e.clientX, y: e.clientY };

    // Add document-level listeners so we keep receiving events off the origin tile
    window.addEventListener("pointermove", handleDocPointerMove, { passive: false });
    window.addEventListener("pointerup", handleDocPointerUp, { passive: false });
    window.addEventListener("pointercancel", handleDocPointerCancel, { passive: false });
  };

  const handleClick = () => {
    // Prioritize bug squash
    if (hasBug) return onClick?.(i, j);

    const growTime = tile?.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
    const isHarvestable = tile?.type === TILE_TYPES.PLANTED && tile?.growth >= growTime;

    if (isHarvestable) {
      onClick?.(i, j);
    } else {
      onClick?.(i, j, true); // open modal
    }
  };

  const renderContent = () => {
    const bugEmoji = hasBug ? "🐛" : "";

    if (tile?.type === TILE_TYPES.PLANTED) {
      const growTime = tile?.upgrade === UPGRADE_TYPES.HYDRO ? 10 : 20;
      const remaining = growTime - (tile?.growth ?? 0);

      return (
        <div className="flex flex-col items-center text-xs space-y-1">
          {remaining <= 0 ? (
            <span className="text-green-600 font-bold animate-bounce">✅ Grown</span>
          ) : (
            <span className="text-gray-900">⏳ {remaining}s</span>
          )}

          {tile?.upgrade === UPGRADE_TYPES.HYDRO && (
            <span className="text-purple-600 bg-purple-100 px-1 rounded">Hydro</span>
          )}

          {bugEmoji && <span className="text-red-500 text-lg">{bugEmoji}</span>}
        </div>
      );
    }

    if (tile?.type === TILE_TYPES.DIRT) {
      return (
        <>
          <span className="text-gray-900">Dirt</span>
          {tile?.upgrade === UPGRADE_TYPES.WATER && (
            <div className="text-blue-600 text-xs font-semibold">💧 Water</div>
          )}
          {tile?.upgrade === UPGRADE_TYPES.EXPAND && (
            <div className="text-green-700 text-xs font-semibold">🪴 Expand</div>
          )}
          {bugEmoji && <div className="text-red-500 text-sm">{bugEmoji}</div>}
        </>
      );
    }

    const isTrulyEmpty = !tile?.type && !tile?.upgrade;

    return (
      <>
        {isTrulyEmpty && <span className="text-gray-800">empty</span>}
        {tile?.upgrade === UPGRADE_TYPES.WATER && (
          <div className="text-blue-600 text-xs font-semibold">💧 Water</div>
        )}
        {tile?.upgrade === UPGRADE_TYPES.HYDRO && (
          <div className="text-purple-600 text-xs font-semibold">Hydro</div>
        )}
        {tile?.upgrade === UPGRADE_TYPES.EXPAND && (
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
      // Keep native click for keyboard/mouse; mobile taps go through pointerup->handleClick
      onClick={handleClick}

      // Pointer start only on the tile itself
      onPointerDown={handlePointerDown}

      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
      style={{
        width: `${tileSize}px`,
        height: `${tileSize}px`,
        fontSize: `${tileSize < 40 ? 9 : 11}px`,
        padding: "2px",
        touchAction: "none",   // disable browser panning inside tiles
        userSelect: "none",
        backgroundColor: hasBug
          ? "#fee2e2"
          : isSelected
          ? "#bfdbfe"
          : tile?.type === TILE_TYPES.DIRT
          ? "#fef3c7"
          : "white",
        border: isSelected ? "2px solid #3b82f6" : "1px solid #ccc",
      }}
      className={`flex flex-col items-center justify-center text-center select-none ${
        hasBug ? "animate-pulse" : ""
      }`}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {tile?.justGrown && (
          <div className="absolute inset-0 flex items-center justify-center text-green-500 text-lg font-bold animate-ping z-10">
            Grown
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
}