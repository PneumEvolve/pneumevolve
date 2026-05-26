// src/Pages/Firefly/useFireflyRoom.js
// WebSocket version — drop-in replacement for the Supabase broadcast version.
// Same exported function names, same handler names. Nothing else in your app changes.
//
// Connect: wss://yourserver/firefly/ws/{roomId}?token={jwt}

import { useEffect, useRef, useCallback } from "react";

const WS_BASE = import.meta.env.VITE_WS_URL || "wss://your-render-app.onrender.com";

export function useFireflyRoom(roomId, handlers) {
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

    let ws;
    let dead = false;

    function connect() {
      if (dead) return;

      const token = localStorage.getItem("access_token");
      const url   = `${WS_BASE}/firefly/ws/${roomId}?token=${token}`;

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
          case "player_move":          h.onPlayerMove?.(msg);          break;
          case "firefly_sync":         h.onFireflySync?.(msg);         break;
          case "ping":                 h.onPing?.(msg);                break;
          case "chat":                 h.onChat?.(msg);                break;
          case "zombie_update":        h.onZombieUpdate?.(msg);        break;
          case "score_update":         h.onScoreUpdate?.(msg);         break;
          case "game_over":            h.onGameOver?.(msg);            break;
          case "player_ready":         h.onPlayerReady?.(msg);         break;
          case "restart":              h.onRestart?.(msg);             break;
          case "zombie_kill":          h.onZombieKill?.(msg);          break;
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
  }, [roomId]);

  const send = useCallback((event, payload = {}) => {
    const msg = { event, ...payload };
    if (connectedRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      pendingSendRef.current = msg;
    }
  }, []);

  const sendPlayerReady  = useCallback(() =>                send("player_ready",  { ready: true }),    [send]);
  const sendPlayerMove   = useCallback((x, y) =>            send("player_move",   { x, y }),           [send]);
  const sendFireflySync  = useCallback((fireflies) =>       send("firefly_sync",  { fireflies }),      [send]);
  const sendPing         = useCallback((x, y) =>            send("ping",          { x, y }),           [send]);
  const sendChat         = useCallback((text, from) =>      send("chat",          { text, from }),     [send]);
  const sendZombieUpdate = useCallback((x, y) =>            send("zombie_update", { x, y }),           [send]);
  const sendScoreUpdate  = useCallback((score, delta) =>    send("score_update",  { score, delta }),   [send]);
  const sendGameOver     = useCallback((final_score) =>     send("game_over",     { final_score }),    [send]);
  const sendRestart      = useCallback((seed, swap) =>      send("restart",       { seed, swap }),     [send]);
  const sendZombieKill   = useCallback(() =>                send("zombie_kill",   {}),                 [send]);

  return {
    sendPlayerReady,
    sendPlayerMove, sendFireflySync, sendPing, sendChat,
    sendZombieUpdate, sendScoreUpdate, sendGameOver, sendRestart, sendZombieKill,
  };
}