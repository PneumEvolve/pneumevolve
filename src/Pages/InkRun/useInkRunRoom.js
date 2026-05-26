// src/Pages/InkRun/useInkRunRoom.js
// WebSocket version — drop-in replacement for the Supabase broadcast version.
// Same exported function names, same handler names. Nothing else in your app changes.
//
// Connect: wss://yourserver/inkrun/ws/{roomId}?token={jwt}

import { useEffect, useRef, useCallback } from "react";

const WS_BASE = import.meta.env.VITE_WS_URL || "wss://your-render-app.onrender.com";

export function useInkRunRoom(roomId, handlers, channelSuffix = "") {
  const wsRef          = useRef(null);
  const handlersRef    = useRef(handlers);
  const connectedRef   = useRef(false);
  const pendingSendRef = useRef(null);
  const reconnectTimer = useRef(null);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!roomId) return;

    const roomKey = channelSuffix ? `${roomId}${channelSuffix}` : String(roomId);

    let ws;
    let dead = false;

    function connect() {
      if (dead) return;

      const token = localStorage.getItem("access_token");
      const url   = `${WS_BASE}/inkrun/ws/${roomKey}?token=${token}`;

      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        connectedRef.current = true;
        if (pendingSendRef.current) {
          ws.send(JSON.stringify(pendingSendRef.current));
          pendingSendRef.current = null;
        }
      };

      ws.onmessage = ({ data }) => {
        let msg;
        try { msg = JSON.parse(data); } catch { return; }

        const h = handlersRef.current;
        switch (msg.event) {
          case "connected":            h.onConnected?.(msg);           break;
          case "partner_connected":    h.onPartnerConnected?.(msg);    break;
          case "partner_disconnected": h.onPartnerDisconnected?.(msg); break;
          case "runner_move":          h.onRunnerMove?.(msg);          break;
          case "stroke_added":         h.onStrokeAdded?.(msg);         break;
          case "stroke_reclaimed":     h.onStrokeReclaimed?.(msg);     break;
          case "enemy_killed":         h.onEnemyKilled?.(msg);         break;
          case "game_over":            h.onGameOver?.(msg);            break;
          case "player_ready":         h.onPlayerReady?.(msg);         break;
          case "restart":              h.onRestart?.(msg);             break;
          case "chat":                 h.onChat?.(msg);                break;
          case "ping":                 h.onPing?.(msg);                break;
          case "wall_time":            h.onWallTime?.(msg);            break;
          case "ink_refill":           h.onInkRefill?.(msg);           break;
          case "ink_eater_pos":        h.onInkEaterMove?.(msg);        break;
          default: break;
        }
      };

      ws.onclose = (e) => {
        connectedRef.current = false;
        if (dead) return;
        if (e.code !== 4001) {
          reconnectTimer.current = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {};
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

  const send = useCallback((event, payload = {}) => {
    const msg = { event, ...payload };
    if (connectedRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      pendingSendRef.current = msg;
    }
  }, []);

  const sendPlayerReady     = useCallback(() =>                          send("player_ready",    { ready: true }),             [send]);
  const sendRunnerMove      = useCallback((x, y, vy, state, wallX) =>   send("runner_move",     { x, y, vy, state, wallX }), [send]);
  const sendStrokeAdded     = useCallback((stroke) =>                    send("stroke_added",    { stroke }),                  [send]);
  const sendStrokeReclaimed = useCallback((strokeId) =>                  send("stroke_reclaimed",{ strokeId }),               [send]);
  const sendEnemyKilled     = useCallback((enemyId) =>                   send("enemy_killed",    { enemyId }),                 [send]);
  const sendGameOver        = useCallback((stats) =>                     send("game_over",        stats),                     [send]);
  const sendRestart         = useCallback((seed, swap) =>                send("restart",         { seed, swap }),             [send]);
  const sendChat            = useCallback((text, from) =>                send("chat",            { text, from }),             [send]);
  const sendPing            = useCallback((wx, wy, from) =>              send("ping",            { wx, wy, from }),           [send]);
  const sendWallTime        = useCallback((startedAt) =>                 send("wall_time",       { startedAt }),              [send]);
  const sendInkRefill       = useCallback((tokenId, amount) =>           send("ink_refill",      { tokenId, amount }),        [send]);
  const sendInkEaterPos     = useCallback((x, y) =>                      send("ink_eater_pos",   { x, y }),                   [send]);

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
    sendInkEaterPos,
  };
}