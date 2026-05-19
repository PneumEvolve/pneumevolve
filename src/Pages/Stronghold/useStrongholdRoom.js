// src/Pages/Stronghold/useStrongholdRoom.js
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useStrongholdRoom(roomId, handlers) {
  const channelRef    = useRef(null);
  const handlersRef   = useRef(handlers);
  const subscribedRef = useRef(false);
  const pendingRef    = useRef(null);

  useEffect(() => { handlersRef.current = handlers; }, [handlers]);

  useEffect(() => {
    if (!roomId) return;
    subscribedRef.current = false;

    const channel = supabase.channel(`stronghold:${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "p1_move" },          ({ payload }) => handlersRef.current.onP1Move?.(payload))
      .on("broadcast", { event: "p2_move" },          ({ payload }) => handlersRef.current.onP2Move?.(payload))
      .on("broadcast", { event: "building_place" },   ({ payload }) => handlersRef.current.onBuildingPlace?.(payload))
      .on("broadcast", { event: "building_repair" },  ({ payload }) => handlersRef.current.onBuildingRepair?.(payload))
      .on("broadcast", { event: "worker_assign" },    ({ payload }) => handlersRef.current.onWorkerAssign?.(payload))
      .on("broadcast", { event: "enemy_update" },     ({ payload }) => handlersRef.current.onEnemyUpdate?.(payload))
      .on("broadcast", { event: "building_health" },  ({ payload }) => handlersRef.current.onBuildingHealth?.(payload))
      .on("broadcast", { event: "unit_update" },      ({ payload }) => handlersRef.current.onUnitUpdate?.(payload))
      .on("broadcast", { event: "gold_update" },      ({ payload }) => handlersRef.current.onGoldUpdate?.(payload))
      .on("broadcast", { event: "phase_change" },     ({ payload }) => handlersRef.current.onPhaseChange?.(payload))
      .on("broadcast", { event: "player_ready" },     ({ payload }) => handlersRef.current.onPlayerReady?.(payload))
      .on("broadcast", { event: "countdown" },        ({ payload }) => handlersRef.current.onCountdown?.(payload))
      .on("broadcast", { event: "game_over" },        ({ payload }) => handlersRef.current.onGameOver?.(payload))
      .on("broadcast", { event: "restart" },          ({ payload }) => handlersRef.current.onRestart?.(payload))
      .on("broadcast", { event: "chat" },             ({ payload }) => handlersRef.current.onChat?.(payload));

    channel.subscribe(status => {
      if (status === "SUBSCRIBED") {
        subscribedRef.current = true;
        channelRef.current    = channel;
        if (pendingRef.current) {
          channel.send(pendingRef.current);
          pendingRef.current = null;
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
      pendingRef.current = msg;
    }
  }, []);

  const sendP1Move         = useCallback((x, y)        => send("p1_move",        { x, y }),             [send]);
  const sendP2Move         = useCallback((x, y)        => send("p2_move",        { x, y }),             [send]);
  const sendBuildingPlace  = useCallback((building)    => send("building_place",  { building }),        [send]);
  const sendBuildingRepair = useCallback((id, hp)      => send("building_repair", { id, hp }),          [send]);
  const sendWorkerAssign   = useCallback((buildingId, workers) => send("worker_assign", { buildingId, workers }), [send]);
  const sendEnemyUpdate    = useCallback((enemies)     => send("enemy_update",    { enemies }),         [send]);
  const sendBuildingHealth = useCallback((buildings)   => send("building_health", { buildings }),       [send]);
  const sendUnitUpdate     = useCallback((units)       => send("unit_update",     { units }),           [send]);
  const sendGoldUpdate     = useCallback((gold)        => send("gold_update",     { gold }),            [send]);
  const sendPhaseChange    = useCallback((phase, data) => send("phase_change",    { phase, ...data }),  [send]);
  const sendPlayerReady    = useCallback((role)        => send("player_ready",    { role }),            [send]);
  const sendCountdown      = useCallback((seconds)     => send("countdown",       { seconds }),         [send]);
  const sendGameOver       = useCallback((score)       => send("game_over",       { score }),           [send]);
  const sendRestart        = useCallback((seed, swap)  => send("restart",         { seed, swap }),      [send]);
  const sendChat           = useCallback((text, from)  => send("chat",            { text, from }),      [send]);

  return {
    sendP1Move, sendP2Move,
    sendBuildingPlace, sendBuildingRepair, sendWorkerAssign,
    sendEnemyUpdate, sendBuildingHealth, sendUnitUpdate, sendGoldUpdate,
    sendPhaseChange, sendPlayerReady, sendCountdown,
    sendGameOver, sendRestart, sendChat,
  };
}