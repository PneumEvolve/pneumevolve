// src/Pages/Homestead/useHearthroom.js
// WebSocket version — drop-in replacement for the Supabase broadcast version.
// Same exported function names, same handler names. Nothing else in your app changes.
//
// Connect: wss://yourserver/homestead/ws/{roomId}?token={jwt}&channel={channel}

import { useEffect, useRef, useCallback } from "react";

const WS_BASE = import.meta.env.VITE_WS_URL || "wss://your-render-app.onrender.com";

export function useHearthroom(roomId, handlers, channelSuffix = "") {
  const wsRef          = useRef(null);
  const handlersRef    = useRef(handlers);
  const connectedRef   = useRef(false);
  const pendingSendRef = useRef([]); // array queue — never lose a message sent before open
  const reconnectTimer = useRef(null);

  // Always use latest handlers without re-subscribing
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!roomId) return;

    // channelSuffix separates in-run sockets from lobby/homestead sockets.
    // We pass it as a query param (?channel=run) rather than embedding it in
    // the path (42:run) so the server's route pattern /homestead/ws/{room_id}
    // still matches and the server can use ?channel to bucket messages.
    const roomKey    = String(roomId);
    const channelTag = channelSuffix ? channelSuffix.replace(/^:/, "") : "";

    let ws;
    let dead = false;

    function connect() {
      if (dead) return;

      const token = localStorage.getItem("access_token");
      const channelParam = channelTag ? `&channel=${encodeURIComponent(channelTag)}` : "";
      const url   = `${WS_BASE}/homestead/ws/${roomKey}?token=${token}${channelParam}`;

      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        connectedRef.current = true;
        // Flush all messages that were queued before the socket opened
        for (const queued of pendingSendRef.current) {
          ws.send(JSON.stringify(queued));
        }
        pendingSendRef.current = [];
        // Notify handlers so callers can re-broadcast ephemeral state (appearance, etc.)
        handlersRef.current.onConnected?.({ event: "connected" });
      };

      ws.onmessage = ({ data }) => {
        let msg;
        try { msg = JSON.parse(data); } catch { return; }

        const h = handlersRef.current;

        switch (msg.event) {
          // ── Meta ──────────────────────────────────────────────────────────
          case "connected":           h.onConnected?.(msg);              break;
          case "partner_connected":   h.onPartnerConnected?.(msg);       break;
          case "partner_disconnected":h.onPartnerDisconnected?.(msg);    break;

          // ── Lobby / presence ──────────────────────────────────────────────
          case "player_ready":        h.onPlayerReady?.(msg);            break;
          case "player_move":         h.onPlayerMove?.(msg);             break;

          // ── Run queue ─────────────────────────────────────────────────────
          case "run_queued":          h.onRunQueued?.(msg);              break;
          case "run_joined":          h.onRunJoined?.(msg);              break;
          case "run_started":         h.onRunStarted?.(msg);             break;
          case "run_cancelled":       h.onRunCancelled?.(msg);           break;

          // ── In-run sync ───────────────────────────────────────────────────
          case "run_move":            h.onRunMove?.(msg);                break;
          case "run_attack":          h.onRunAttack?.(msg);              break;
          case "enemy_hit":           h.onEnemyHit?.(msg);              break;
          case "enemy_killed":        h.onEnemyKilled?.(msg);           break;
          case "tree_hit":            h.onTreeHit?.(msg);               break;
          case "tree_killed":         h.onTreeKilled?.(msg);            break;
          case "deposit_hit":         h.onDepositHit?.(msg);            break;
          case "deposit_killed":      h.onDepositKilled?.(msg);         break;
          case "pickup_collected":    h.onPickupCollected?.(msg);        break;
          case "loot_dropped":        h.onLootDropped?.(msg);           break;
          case "run_state_request":   h.onRunStateRequest?.(msg);        break;
          case "run_state_sync":      h.onRunStateSync?.(msg);          break;

          // ── Run end ───────────────────────────────────────────────────────
          case "run_complete":        h.onRunComplete?.(msg);            break;

          // ── Homestead sync ────────────────────────────────────────────────
          case "chest_updated":       h.onChestUpdated?.(msg);           break;
          case "object_placed":       h.onObjectPlaced?.(msg);           break;
          case "object_removed":      h.onObjectRemoved?.(msg);          break;
          case "farm_updated":        h.onFarmUpdated?.(msg);            break;
          case "player_state_sync":   h.onPlayerStateSync?.(msg);        break;
          case "town_state_updated":  h.onTownStateUpdated?.(msg);       break;

          // ── Misc ──────────────────────────────────────────────────────────
          case "ping":                h.onPing?.(msg);                   break;
          case "chat":                h.onChat?.(msg);                   break;
          case "player_appearance":   h.onPlayerAppearance?.(msg);       break;

          default:
            // Unknown event — safe to ignore
            break;
        }
      };

      ws.onclose = (e) => {
        connectedRef.current = false;
        if (dead) return;
        // Auto-reconnect after 2s unless it was an auth failure (4001)
        if (e.code !== 4001) {
          reconnectTimer.current = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        // onclose will fire after onerror; reconnect logic lives there
      };
    }

    connect();

    return () => {
      dead = true;
      connectedRef.current = false;
      clearTimeout(reconnectTimer.current);
      if (ws) ws.close();
      wsRef.current = null;
    };
  }, [roomId, channelSuffix]);

  // ── Core send ──────────────────────────────────────────────────────────────
  const send = useCallback((event, payload = {}) => {
    const msg = { event, ...payload };
    if (connectedRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      // Queue it — will flush on connect (array so nothing is lost)
      pendingSendRef.current.push(msg);
    }
  }, []);

  // ── Lobby ─────────────────────────────────────────────────────────────────
  const sendPlayerReady     = useCallback(() =>                         send("player_ready",    { ready: true }),           [send]);
  const sendPlayerMove      = useCallback((x, y, facing, jumpVY) =>     send("player_move",     { x, y, facing, jumpVY }),  [send]);

  // ── Run queue ─────────────────────────────────────────────────────────────
  const sendRunQueued       = useCallback((runType, seed) =>            send("run_queued",      { runType, seed }),          [send]);
  const sendRunJoined       = useCallback((playerId) =>                 send("run_joined",      { playerId }),               [send]);
  const sendRunStarted      = useCallback((seed, runType) =>            send("run_started",     { seed, runType }),          [send]);
  const sendRunCancelled    = useCallback(() =>                         send("run_cancelled",   {}),                         [send]);

  // ── In-run ────────────────────────────────────────────────────────────────
  const sendRunMove         = useCallback((x, y, facing) =>             send("run_move",        { x, y, facing }),          [send]);
  const sendRunAttack       = useCallback((x, y, facing) =>             send("run_attack",      { x, y, facing }),          [send]);
  const sendEnemyHit        = useCallback((id, hp) =>                   send("enemy_hit",       { id, hp }),                [send]);
  const sendEnemyKilled     = useCallback((id, loot) =>                 send("enemy_killed",    { id, loot }),              [send]);
  const sendTreeHit         = useCallback((id, hp) =>                   send("tree_hit",        { id, hp }),                [send]);
  const sendTreeKilled      = useCallback((id) =>                       send("tree_killed",     { id }),                    [send]);
  const sendDepositHit      = useCallback((id, hp) =>                   send("deposit_hit",     { id, hp }),                [send]);
  const sendDepositKilled   = useCallback((id) =>                       send("deposit_killed",  { id }),                    [send]);
  const sendPickupCollected = useCallback((id) =>                       send("pickup_collected",{ id }),                    [send]);
  const sendLootDropped     = useCallback((drops) =>                    send("loot_dropped",    { drops }),                  [send]);
  const sendRunStateRequest = useCallback(() =>                         send("run_state_request",{}),                        [send]);
  const sendRunStateSync    = useCallback((state) =>                    send("run_state_sync",  state),                     [send]);

  // ── Run end ───────────────────────────────────────────────────────────────
  const sendRunComplete     = useCallback((loot) =>                     send("run_complete",    { loot }),                  [send]);

  // ── Homestead ─────────────────────────────────────────────────────────────
  const sendChestUpdated    = useCallback((inventory) =>                send("chest_updated",   { inventory }),             [send]);
  const sendObjectPlaced    = useCallback((obj) =>                      send("object_placed",   { obj }),                   [send]);
  const sendObjectRemoved   = useCallback((id) =>                       send("object_removed",  { id }),                    [send]);
  const sendFarmUpdated     = useCallback((plots, nodeState) =>          send("farm_updated",    { plots, nodeState }),      [send]);
  const sendPlayerStateSync = useCallback((state) =>                    send("player_state_sync", state),                   [send]);
  const sendTownStateUpdated = useCallback((townState) =>               send("town_state_updated", { town_state: townState }), [send]);

  // ── Misc ──────────────────────────────────────────────────────────────────
  const sendPing              = useCallback((wx, wy) =>                 send("ping",              { wx, wy }),              [send]);
  const sendChat              = useCallback((text, from) =>             send("chat",              { text, from }),          [send]);
  const sendPlayerAppearance  = useCallback((character, equipment, hotbar) =>
                                                                        send("player_appearance", { character, equipment, hotbar }), [send]);

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
    sendTreeHit,
    sendTreeKilled,
    sendDepositHit,
    sendDepositKilled,
    sendPickupCollected,
    sendLootDropped,
    sendRunStateRequest,
    sendRunStateSync,
    sendRunComplete,
    sendChestUpdated,
    sendObjectPlaced,
    sendObjectRemoved,
    sendFarmUpdated,
    sendPlayerStateSync,
    sendTownStateUpdated,
    sendPing,
    sendChat,
    sendPlayerAppearance,
  };
}