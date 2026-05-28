// src/Pages/Homestead/runs_useRunLoop.js
//
// Shared run-loop scaffolding. Owns the boring boilerplate every run scene
// re-implements (canvas + resize, RAF + dt + time, makeSounds, useHearthroom
// plumbing, pause overlay state, partner-appearance ref). Scene-specific
// logic — keyboard, click handlers, attack, drawing, custom hearthroom
// signals — stays in the run file where it belongs.
//
// Designed after ForestRun's actual needs:
//   - Runs pause on EITHER pauseOpen or any extra source (e.g. an open tab
//     menu) → `extraPauseRef` option.
//   - Runs override useHearthroom handlers (e.g. to broadcast appearance
//     on reconnect) → `handlers` option.
//   - Runs may finish the run in non-default ways (compute a delta from a
//     start snapshot, attach final equipment, etc) → caller owns finishRun;
//     the hook just exposes refs + tick the caller can call from their own
//     finishRun.
//
// The tick callback is called EVERY frame, paused or not. It receives
// `helpers.paused` and is expected to skip world updates itself — this
// lets runs still redraw a frozen scene while paused. Runs do their own
// duration / hp / etc. completion checks inside tick.
//
// ── Usage sketch ──────────────────────────────────────────────────────────
//   const { canvasRef, pauseOpen, setPauseOpen, pauseOpenRef,
//           stateRef, soundRef, keysRef, partnerAppearanceRef, lastMoveRef,
//           sendRunMove, sendPlayerAppearance }
//     = useRunLoop({
//         room, palette: "forest",
//         initState: () => ({ … }),
//         tick: (state, ctx, dt, t, W, H, helpers) => {
//           if (!helpers.paused) { …update world… }
//           …draw…
//         },
//         extraPauseRef: tabMenuOpenRef,
//         handlers: { onConnected: …, onRunMove: …, onPlayerAppearance: … },
//         character, equipment, hotbar,
//       });
//
//   // Custom keys / click handlers live in your own useEffect; use the
//   // refs returned by useRunLoop. The hook handles `Escape` → pause for
//   // you (idempotent — your handler can also map Escape if you need to).

import { useCallback, useEffect, useRef, useState } from "react";
import { useHearthroom } from "./useHearthroom";
import { makeSounds } from "./audio_sounds";

const DEFAULT_MOVE_THROTTLE_MS = 50;

export function useRunLoop({
  room,
  palette,
  initState,
  tick,
  handlers: handlersOverride,
  onRunComplete,          // accepted but never called by the hook — caller's
                          // finishRun calls this. Kept in the signature so
                          // every run file's parameter list stays uniform.
  character,
  equipment,
  hotbar,
  extraPauseRef,
  // Optional caller-owned refs. Useful when the caller wants to define
  // hearthroom handler closures BEFORE this hook is called — they can close
  // over their own refs directly and skip the forwarder dance. If omitted,
  // the hook creates its own.
  stateRef: externalStateRef,
  partnerAppearanceRef: externalPartnerAppearanceRef,
  movementThrottleMs = DEFAULT_MOVE_THROTTLE_MS,
}) {
  // ── Refs the hook owns ────────────────────────────────────────────────────
  const canvasRef            = useRef(null);
  const rafRef               = useRef(null);
  const keysRef              = useRef({});
  const ownStateRef          = useRef(null);
  const stateRef             = externalStateRef ?? ownStateRef;
  const soundRef             = useRef(null);
  const lastMoveRef          = useRef(0);
  const ownPartnerAppearanceRef = useRef({ character: null, equipment: null });
  const partnerAppearanceRef = externalPartnerAppearanceRef ?? ownPartnerAppearanceRef;

  // Keep the latest tick callable from the RAF loop without re-spawning the
  // loop effect. The loop is captured once at mount; the dispatcher it uses
  // reads tickRef.current, which we refresh on every render so callers can
  // re-create their tick closure freely (e.g. to capture fresh useCallbacks).
  const tickRef = useRef(tick);
  tickRef.current = tick;

  // ── Pause state ───────────────────────────────────────────────────────────
  const [pauseOpen, setPauseOpen] = useState(false);
  const pauseOpenRef = useRef(false);
  useEffect(() => { pauseOpenRef.current = pauseOpen; }, [pauseOpen]);

  // ── Hearthroom plumbing ───────────────────────────────────────────────────
  // Default handlers do "the obvious thing" (mirror partner position / store
  // partner appearance). A caller can pass `handlers` to override or extend.
  const defaultHandlers = useRef({
    onRunMove: ({ x, y, facing, jumpVY }) => {
      const s = stateRef.current;
      if (!s) return;
      // Smooth interpolation if the run state has the relevant fields;
      // otherwise just snap.
      if ("partnerFromX" in s) {
        s.partnerFromX = s.partnerToX ?? x;
        s.partnerFromY = s.partnerToY ?? y;
        s.partnerToX   = x;
        s.partnerToY   = y;
        s.partnerLerpT = 0;
      }
      s.partnerX       = x;
      s.partnerY       = y;
      s.partnerFacing  = facing;
      s.partnerVisible = true;
      if (jumpVY != null && "partnerJumpVY" in s) s.partnerJumpVY = jumpVY;
    },
    onPlayerAppearance: ({ character: ch, equipment: eq }) => {
      partnerAppearanceRef.current = { character: ch, equipment: eq };
    },
  }).current;

  // Merge override on top of defaults so callers can supply just the bits
  // they care about (e.g. just `onConnected`) without re-stating the others.
  // We re-merge each render — useHearthroom's internal handlersRef tracks
  // the latest object via a useEffect, so this is cheap and lets callers
  // mutate handler entries between renders without identity gymnastics.
  const mergedHandlers = { ...defaultHandlers, ...(handlersOverride ?? {}) };

  const { sendRunMove, sendPlayerAppearance, ...rest } =
    useHearthroom(room?.id ?? null, mergedHandlers, ":run");

  // Throttled broadcast — runs can also call sendRunMove directly if they
  // need to flush an instant update (e.g. on jump).
  const broadcastMove = useCallback((x, y, facing, jumpVY, throttle = movementThrottleMs) => {
    const now = performance.now();
    if (throttle > 0 && (now - lastMoveRef.current < throttle)) return;
    lastMoveRef.current = now;
    sendRunMove(Math.round(x), Math.round(y), facing, jumpVY);
  }, [sendRunMove, movementThrottleMs]);

  // Broadcast appearance whenever character / equipment / hotbar changes.
  useEffect(() => {
    sendPlayerAppearance(character, equipment, hotbar);
  }, [character, equipment, hotbar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Main effect: canvas + RAF ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    soundRef.current = makeSounds(palette);

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    stateRef.current = { lastTime: performance.now(), ...initState() };

    // helpers given to tick on every frame
    const helpers = {
      get paused() { return pauseOpenRef.current || !!extraPauseRef?.current; },
      get keys() { return keysRef.current; },
      get sound() { return soundRef.current; },
      get partnerAppearance() { return partnerAppearanceRef.current; },
      broadcastMove,
      sendRunMove,
    };

    const ctx = canvas.getContext("2d");

    const loop = (ts) => {
      rafRef.current = requestAnimationFrame(loop);
      const state = stateRef.current;
      if (!canvas || !state || state.over) return;

      const W  = canvas.width, H = canvas.height;
      const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
      state.lastTime = ts;
      const t  = ts / 1000;

      try {
        tickRef.current?.(state, ctx, dt, t, W, H, helpers);
      } catch (err) {
        console.error("[useRunLoop] tick threw:", err);
      }
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
    // Intentional: tick / initState / etc. close over their own scene refs;
    // we don't want to re-spawn the loop on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette]);

  return {
    canvasRef,
    pauseOpen, setPauseOpen, pauseOpenRef,
    stateRef, soundRef, keysRef, partnerAppearanceRef, lastMoveRef,
    broadcastMove,
    sendRunMove, sendPlayerAppearance,
    ...rest, // any extra sendX helpers useHearthroom returns
  };
}
