// src/lib/useSlalomRoom.js
//
// Multiplayer sync for Freeskate Slalom.
// P1 owns the game loop and broadcasts full game state each frame.
// P2 only sends their skate angle back.
//
// Events:
//   p2_input      — P2 → P1: { angle }
//   game_state    — P1 → P2: { topSkate, botSkate, items, gems, misses, gameOver, wipeout }
//   game_over     — P1 → both: { final_gems }
//   restart       — either → both: {}
//   player_ready  — both → both: { ready: true }

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useSlalomRoom(roomId, handlers) {
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
    const channelName = `slalom:${roomId}`;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "p2_input" },     ({ payload }) => handlersRef.current.onP2Input?.(payload))
      .on("broadcast", { event: "game_state" },   ({ payload }) => handlersRef.current.onGameState?.(payload))
      .on("broadcast", { event: "game_over" },    ({ payload }) => handlersRef.current.onGameOver?.(payload))
      .on("broadcast", { event: "restart" },      ({ payload }) => handlersRef.current.onRestart?.(payload))
      .on("broadcast", { event: "player_ready" }, ({ payload }) => handlersRef.current.onPlayerReady?.(payload));

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        subscribedRef.current = true;
        channelRef.current = channel;
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

  // P2 → P1: send skate angle input
  const sendP2Input = useCallback((angle) =>
    send("p2_input", { angle }), [send]);

  // P1 → P2: broadcast full game state (throttled in game loop to ~20fps)
  const sendGameState = useCallback((state) =>
    send("game_state", state), [send]);

  // P1 → both: game ended
  const sendGameOver = useCallback((final_gems) =>
    send("game_over", { final_gems }), [send]);

  // either → both: restart
  const sendRestart = useCallback(() =>
    send("restart", {}), [send]);

  // both → both: ready up
  const sendPlayerReady = useCallback(() =>
    send("player_ready", { ready: true }), [send]);

  return {
    sendP2Input,
    sendGameState,
    sendGameOver,
    sendRestart,
    sendPlayerReady,
  };
}