// src/Pages/InkRun/useInkRunRoom.js
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useInkRunRoom(roomId, handlers, channelSuffix = "") {
  const channelRef    = useRef(null);
  const handlersRef   = useRef(handlers);
  const subscribedRef = useRef(false);
  const pendingSendRef = useRef(null);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!roomId) return;

    subscribedRef.current = false;
    const channelName = `inkrun:${roomId}${channelSuffix}`;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "runner_move"     }, ({ payload }) => handlersRef.current.onRunnerMove?.(payload))
      .on("broadcast", { event: "stroke_added"    }, ({ payload }) => handlersRef.current.onStrokeAdded?.(payload))
      .on("broadcast", { event: "stroke_reclaimed"}, ({ payload }) => handlersRef.current.onStrokeReclaimed?.(payload))
      .on("broadcast", { event: "enemy_killed"    }, ({ payload }) => handlersRef.current.onEnemyKilled?.(payload))
      .on("broadcast", { event: "game_over"       }, ({ payload }) => handlersRef.current.onGameOver?.(payload))
      .on("broadcast", { event: "player_ready"    }, ({ payload }) => handlersRef.current.onPlayerReady?.(payload))
      .on("broadcast", { event: "restart"         }, ({ payload }) => handlersRef.current.onRestart?.(payload))
      .on("broadcast", { event: "chat"            }, ({ payload }) => handlersRef.current.onChat?.(payload))
      .on("broadcast", { event: "ping"            }, ({ payload }) => handlersRef.current.onPing?.(payload))
      .on("broadcast", { event: "wall_time"       }, ({ payload }) => handlersRef.current.onWallTime?.(payload))
      .on("broadcast", { event: "ink_refill"      }, ({ payload }) => handlersRef.current.onInkRefill?.(payload));

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        subscribedRef.current = true;
        channelRef.current    = channel;
        if (pendingSendRef.current) {
          channel.send(pendingSendRef.current);
          pendingSendRef.current = null;
        }
      }
    });

    channelRef.current = channel;

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId]);

  const send = useCallback((event, payload) => {
    const msg = { type: "broadcast", event, payload };
    if (subscribedRef.current && channelRef.current) {
      channelRef.current.send(msg);
    } else {
      pendingSendRef.current = msg;
    }
  }, []);

  const sendPlayerReady   = useCallback(() =>                       send("player_ready",   { ready: true }),              [send]);
  const sendRunnerMove    = useCallback((x, y, vy, state, wallX) => send("runner_move",    { x, y, vy, state, wallX }), [send]);
  // stroke: { id, color, points: [{x,y},...] }
  const sendStrokeAdded   = useCallback((stroke) =>                 send("stroke_added",   { stroke }),                 [send]);
  const sendStrokeReclaimed = useCallback((strokeId) =>             send("stroke_reclaimed",{ strokeId }),              [send]);
  const sendEnemyKilled   = useCallback((enemyId) =>                send("enemy_killed",   { enemyId }),                [send]);
  const sendGameOver      = useCallback((stats) =>                  send("game_over",        stats),                    [send]);
  const sendRestart       = useCallback((seed, swap) =>             send("restart",         { seed, swap }),            [send]);
  const sendChat          = useCallback((text, from) =>             send("chat",            { text, from }),            [send]);
  // ping: world-space marker so painter can see where runner needs help
  const sendPing          = useCallback((wx, wy, from) =>           send("ping",            { wx, wy, from }),          [send]);
  // wall_time: runner broadcasts authoritative game-start timestamp so painter syncs grace timer
  const sendWallTime      = useCallback((startedAt) =>              send("wall_time",       { startedAt }),             [send]);
  const sendInkRefill     = useCallback((tokenId, amount) =>        send("ink_refill",      { tokenId, amount }),       [send]);

  return {
    sendPlayerReady,
    sendRunnerMove,
    sendStrokeAdded,
    sendStrokeReclaimed,
    sendEnemyKilled,
    sendGameOver,
    sendRestart,
    sendChat,
    sendPing,
    sendWallTime,
    sendInkRefill,
  };
}