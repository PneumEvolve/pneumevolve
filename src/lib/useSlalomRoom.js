// src/lib/useSlalomRoom.js
// WebSocket version — drop-in replacement for the Supabase broadcast version.
// Same exported function names, same handler names. Nothing else in your app changes.
//
// Connect: wss://yourserver/slalom/ws/{roomId}?token={jwt}
//
// Events (unchanged from original):
//   p2_input      — P2 → P1: { angle }
//   game_state    — P1 → P2: { topSkate, botSkate, items, gems, misses, gameOver, wipeout }
//   game_over     — P1 → both: { final_gems }
//   restart       — either → both: {}
//   player_ready  — both → both: { ready: true }

import { useEffect, useRef, useCallback } from "react";

const WS_BASE = import.meta.env.VITE_WS_URL || "wss://your-render-app.onrender.com";

export function useSlalomRoom(roomId, handlers) {
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
      const url   = `${WS_BASE}/slalom/ws/${roomId}?token=${token}`;

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
          case "p2_input":             h.onP2Input?.(msg);             break;
          case "game_state":           h.onGameState?.(msg);           break;
          case "game_over":            h.onGameOver?.(msg);            break;
          case "restart":              h.onRestart?.(msg);             break;
          case "player_ready":         h.onPlayerReady?.(msg);         break;
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

  const sendP2Input     = useCallback((angle) =>       send("p2_input",     { angle }),       [send]);
  const sendGameState   = useCallback((state) =>       send("game_state",    state),           [send]);
  const sendGameOver    = useCallback((final_gems) =>  send("game_over",    { final_gems }),   [send]);
  const sendRestart     = useCallback(() =>            send("restart",      {}),               [send]);
  const sendPlayerReady = useCallback(() =>            send("player_ready", { ready: true }),  [send]);

  return {
    sendP2Input,
    sendGameState,
    sendGameOver,
    sendRestart,
    sendPlayerReady,
  };
}