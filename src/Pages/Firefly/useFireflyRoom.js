// src/Pages/Firefly/useFireflyRoom.js
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useFireflyRoom(roomId, handlers) {
  const channelRef     = useRef(null);
  const handlersRef    = useRef(handlers);
  const subscribedRef  = useRef(false);
  const pendingSendRef = useRef(null);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!roomId) return;

    subscribedRef.current = false;
    const channelName = `game:${roomId}`;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "player_move" },   ({ payload }) => handlersRef.current.onPlayerMove?.(payload))
      .on("broadcast", { event: "firefly_sync" },  ({ payload }) => handlersRef.current.onFireflySync?.(payload))
      .on("broadcast", { event: "ping" },           ({ payload }) => handlersRef.current.onPing?.(payload))
      .on("broadcast", { event: "chat" },           ({ payload }) => handlersRef.current.onChat?.(payload))
      .on("broadcast", { event: "zombie_update" },  ({ payload }) => handlersRef.current.onZombieUpdate?.(payload))
      .on("broadcast", { event: "score_update" },   ({ payload }) => handlersRef.current.onScoreUpdate?.(payload))
      .on("broadcast", { event: "game_over" },      ({ payload }) => handlersRef.current.onGameOver?.(payload))
      .on("broadcast", { event: "player_ready" },   ({ payload }) => handlersRef.current.onPlayerReady?.(payload))
      .on("broadcast", { event: "restart" },        ({ payload }) => handlersRef.current.onRestart?.(payload))
      .on("broadcast", { event: "zombie_kill" },    ({ payload }) => handlersRef.current.onZombieKill?.(payload));

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

  const sendPlayerReady  = useCallback(() =>               send("player_ready",  { ready: true }),        [send]);
  const sendPlayerMove   = useCallback((x, y) =>           send("player_move",   { x, y }),               [send]);
  const sendFireflySync  = useCallback((fireflies) =>      send("firefly_sync",  { fireflies }),          [send]);
  const sendPing         = useCallback((x, y) =>           send("ping",          { x, y }),               [send]);
  const sendChat         = useCallback((text, from) =>     send("chat",          { text, from }),         [send]);
  const sendZombieUpdate = useCallback((x, y) =>           send("zombie_update", { x, y }),               [send]);
  const sendScoreUpdate  = useCallback((score, delta) =>   send("score_update",  { score, delta }),       [send]);
  const sendGameOver     = useCallback((final_score) =>    send("game_over",     { final_score }),        [send]);
  // seed: integer map seed for the new game; swap: bool — true means roles flip
  const sendRestart      = useCallback((seed, swap) =>     send("restart",       { seed, swap }),         [send]);
  const sendZombieKill   = useCallback(() =>               send("zombie_kill",   {}),                     [send]);

  return {
    sendPlayerReady,
    sendPlayerMove, sendFireflySync, sendPing, sendChat,
    sendZombieUpdate, sendScoreUpdate, sendGameOver, sendRestart, sendZombieKill,
  };
}