// src/Pages/Homestead/useHearthroom.js
// Supabase realtime hook — mirrors the useInkRunRoom pattern exactly.
// Channel naming: `homestead:{roomId}` or `homestead:{roomId}:run` for run sessions.

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useHearthroom(roomId, handlers, channelSuffix = "") {
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
    const channelName = `homestead:${roomId}${channelSuffix}`;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      // ── Lobby / presence ──────────────────────────────────────────────
      .on("broadcast", { event: "player_ready"    }, ({ payload }) => handlersRef.current.onPlayerReady?.(payload))
      .on("broadcast", { event: "player_move"     }, ({ payload }) => handlersRef.current.onPlayerMove?.(payload))
      // ── Run queue ─────────────────────────────────────────────────────
      .on("broadcast", { event: "run_queued"      }, ({ payload }) => handlersRef.current.onRunQueued?.(payload))
      .on("broadcast", { event: "run_joined"      }, ({ payload }) => handlersRef.current.onRunJoined?.(payload))
      .on("broadcast", { event: "run_started"     }, ({ payload }) => handlersRef.current.onRunStarted?.(payload))
      .on("broadcast", { event: "run_cancelled"   }, ({ payload }) => handlersRef.current.onRunCancelled?.(payload))
      // ── In-run sync ───────────────────────────────────────────────────
      .on("broadcast", { event: "run_move"        }, ({ payload }) => handlersRef.current.onRunMove?.(payload))
      .on("broadcast", { event: "run_attack"      }, ({ payload }) => handlersRef.current.onRunAttack?.(payload))
      .on("broadcast", { event: "enemy_hit"       }, ({ payload }) => handlersRef.current.onEnemyHit?.(payload))
      .on("broadcast", { event: "enemy_killed"    }, ({ payload }) => handlersRef.current.onEnemyKilled?.(payload))
      .on("broadcast", { event: "pickup_collected"}, ({ payload }) => handlersRef.current.onPickupCollected?.(payload))
      .on("broadcast", { event: "loot_dropped"    }, ({ payload }) => handlersRef.current.onLootDropped?.(payload))
      .on("broadcast", { event: "run_state_request"},({ payload }) => handlersRef.current.onRunStateRequest?.(payload))
      .on("broadcast", { event: "run_state_sync"  }, ({ payload }) => handlersRef.current.onRunStateSync?.(payload))
      // ── Run end ───────────────────────────────────────────────────────
      .on("broadcast", { event: "run_complete"    }, ({ payload }) => handlersRef.current.onRunComplete?.(payload))
      // ── Homestead sync ────────────────────────────────────────────────
      .on("broadcast", { event: "chest_updated"   }, ({ payload }) => handlersRef.current.onChestUpdated?.(payload))
      .on("broadcast", { event: "object_placed"   }, ({ payload }) => handlersRef.current.onObjectPlaced?.(payload))
      .on("broadcast", { event: "object_removed"  }, ({ payload }) => handlersRef.current.onObjectRemoved?.(payload))
      // ── Misc ──────────────────────────────────────────────────────────
      .on("broadcast", { event: "ping"              }, ({ payload }) => handlersRef.current.onPing?.(payload))
      .on("broadcast", { event: "chat"              }, ({ payload }) => handlersRef.current.onChat?.(payload))
      .on("broadcast", { event: "player_appearance" }, ({ payload }) => handlersRef.current.onPlayerAppearance?.(payload));

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
  }, [roomId, channelSuffix]);

  const send = useCallback((event, payload) => {
    const msg = { type: "broadcast", event, payload };
    if (subscribedRef.current && channelRef.current) {
      channelRef.current.send(msg);
    } else {
      pendingSendRef.current = msg;
    }
  }, []);

  // ── Lobby ────────────────────────────────────────────────────────────────────
  const sendPlayerReady    = useCallback(() =>                    send("player_ready",   { ready: true }),         [send]);
  const sendPlayerMove     = useCallback((x, y, facing) =>        send("player_move",    { x, y, facing }),        [send]);

  // ── Run queue ────────────────────────────────────────────────────────────────
  const sendRunQueued      = useCallback((runType, seed) =>       send("run_queued",     { runType, seed }),        [send]);
  const sendRunJoined      = useCallback((playerId) =>            send("run_joined",     { playerId }),             [send]);
  const sendRunStarted     = useCallback((seed) =>                send("run_started",    { seed }),                 [send]);
  const sendRunCancelled   = useCallback(() =>                    send("run_cancelled",  {}),                       [send]);

  // ── In-run ───────────────────────────────────────────────────────────────────
  const sendRunMove        = useCallback((x, y, facing) =>        send("run_move",       { x, y, facing }),        [send]);
  const sendRunAttack      = useCallback((x, y, facing) =>        send("run_attack",     { x, y, facing }),        [send]);
  const sendEnemyHit       = useCallback((id, hp) =>              send("enemy_hit",      { id, hp }),              [send]);
  const sendEnemyKilled    = useCallback((id, loot) =>            send("enemy_killed",   { id, loot }),            [send]);
  const sendPickupCollected= useCallback((id) =>                  send("pickup_collected",{ id }),                 [send]);
  const sendLootDropped    = useCallback((drops) =>               send("loot_dropped",   { drops }),               [send]);
  const sendRunStateRequest= useCallback(() =>                    send("run_state_request", {}),                   [send]);
  const sendRunStateSync   = useCallback((state) =>               send("run_state_sync", state),                   [send]);

  // ── Run end ──────────────────────────────────────────────────────────────────
  const sendRunComplete    = useCallback((loot) =>                send("run_complete",   { loot }),                [send]);

  // ── Homestead ────────────────────────────────────────────────────────────────
  const sendChestUpdated   = useCallback((inventory) =>           send("chest_updated",  { inventory }),           [send]);
  const sendObjectPlaced   = useCallback((obj) =>                 send("object_placed",  { obj }),                 [send]);
  const sendObjectRemoved  = useCallback((id) =>                  send("object_removed", { id }),                  [send]);

  // ── Misc ─────────────────────────────────────────────────────────────────────
  const sendPing             = useCallback((wx, wy) =>              send("ping",              { wx, wy }),              [send]);
  const sendChat             = useCallback((text, from) =>          send("chat",              { text, from }),          [send]);
  const sendPlayerAppearance = useCallback((character, equipment, hotbar) => send("player_appearance", { character, equipment, hotbar }), [send]);

  return {
    sendPlayerReady,
    sendPlayerMove,
    sendRunQueued,
    sendRunJoined,
    sendRunStarted,
    sendRunCancelled,
    sendRunMove,
    sendRunAttack,
    sendEnemyHit,
    sendEnemyKilled,
    sendPickupCollected,
    sendLootDropped,
    sendRunStateRequest,
    sendRunStateSync,
    sendRunComplete,
    sendChestUpdated,
    sendObjectPlaced,
    sendObjectRemoved,
    sendPing,
    sendChat,
    sendPlayerAppearance,
  };
}