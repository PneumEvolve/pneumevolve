// src/Pages/Stronghold/useStrongholdRoom.js
// WebSocket version — drop-in replacement for the Supabase broadcast version.
// Same exported function names, same handler names. Nothing else in your app changes.
//
// Connect: wss://yourserver/stronghold/ws/{roomId}?token={jwt}

import { useEffect, useRef, useCallback } from "react";

const WS_BASE = import.meta.env.VITE_WS_URL || "wss://your-render-app.onrender.com";

export function useStrongholdRoom(roomId, handlers) {
  const wsRef          = useRef(null);
  const handlersRef    = useRef(handlers);
  const connectedRef   = useRef(false);
  const pendingRef     = useRef([]);
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
      const url   = `${WS_BASE}/stronghold/ws/${roomId}?token=${token}`;

      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        connectedRef.current = true;
        // Flush queue — stronghold uses an array like the original
        if (pendingRef.current.length > 0) {
          pendingRef.current.forEach(msg => ws.send(JSON.stringify(msg)));
          pendingRef.current = [];
        }
      };

      ws.onmessage = ({ data }) => {
        let msg;
        try { msg = JSON.parse(data); } catch { return; }

        const h = handlersRef.current;
        switch (msg.event) {
          case "connected":             h.onConnected?.(msg);            break;
          case "partner_connected":     h.onPartnerConnected?.(msg);     break;
          case "partner_disconnected":  h.onPartnerDisconnected?.(msg);  break;
          case "p1_move":               h.onP1Move?.(msg);               break;
          case "p2_move":               h.onP2Move?.(msg);               break;
          case "building_place":        h.onBuildingPlace?.(msg);        break;
          case "building_repair":       h.onBuildingRepair?.(msg);       break;
          case "worker_assign":         h.onWorkerAssign?.(msg);         break;
          case "enemy_update":          h.onEnemyUpdate?.(msg);          break;
          case "building_health":       h.onBuildingHealth?.(msg);       break;
          case "unit_update":           h.onUnitUpdate?.(msg);           break;
          case "gold_update":           h.onGoldUpdate?.(msg);           break;
          case "phase_change":          h.onPhaseChange?.(msg);          break;
          case "player_ready":          h.onPlayerReady?.(msg);          break;
          case "countdown":             h.onCountdown?.(msg);            break;
          case "game_over":             h.onGameOver?.(msg);             break;
          case "restart":               h.onRestart?.(msg);              break;
          case "chat":                  h.onChat?.(msg);                 break;
          case "revive":                h.onRevive?.(msg);               break;
          case "ping":                  h.onPing?.(msg);                 break;
          case "wave_summary":          h.onWaveSummary?.(msg);          break;
          case "save_state":            h.onSaveState?.(msg);            break;
          case "allegiance_change":     h.onAllegianceChange?.(msg);     break;
          case "building_upgrade":      h.onBuildingUpgrade?.(msg);      break;
          case "building_sell":         h.onBuildingSell?.(msg);         break;
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
      pendingRef.current = [];
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
      pendingRef.current.push(msg);
    }
  }, []);

  const sendP1Move           = useCallback((x, y) =>         send("p1_move",          { x, y }),                                          [send]);
  const sendP2Move           = useCallback((x, y) =>         send("p2_move",          { x, y }),                                          [send]);
  const sendBuildingPlace    = useCallback((building) =>      send("building_place",   { building }),                                      [send]);
  const sendBuildingRepair   = useCallback((id, hp) =>        send("building_repair",  { id, hp }),                                        [send]);
  const sendWorkerAssign     = useCallback((buildingId, workers) => send("worker_assign", { buildingId, workers }),                        [send]);
  const sendEnemyUpdate      = useCallback((enemies) =>       send("enemy_update",     { enemies }),                                       [send]);
  const sendBuildingHealth   = useCallback((buildings, builderHp, protectorHp, lockedWorkers) =>
                                                              send("building_health",  { buildings, builderHp, protectorHp, lockedWorkers }),[send]);
  const sendUnitUpdate       = useCallback((units) =>         send("unit_update",      { units }),                                         [send]);
  const sendGoldUpdate       = useCallback((payload) =>
    send("gold_update", typeof payload === "number" ? { gold: payload, from: "protector" } : payload),                                     [send]);
  const sendPhaseChange      = useCallback((phase, data) =>   send("phase_change",     { phase, ...data }),                                [send]);
  const sendPlayerReady      = useCallback((role, context) => send("player_ready",     { role, context }),                                 [send]);
  const sendCountdown        = useCallback((seconds) =>       send("countdown",        { seconds }),                                       [send]);
  const sendGameOver         = useCallback((score) =>         send("game_over",        { score }),                                         [send]);
  const sendRestart          = useCallback((seed, swap) =>    send("restart",          { seed, swap }),                                    [send]);
  const sendChat             = useCallback((text, from) =>    send("chat",             { text, from }),                                    [send]);
  const sendRevive           = useCallback((target) =>        send("revive",           { target }),                                        [send]);
  const sendPing             = useCallback((x, y, from) =>    send("ping",             { x, y, from }),                                    [send]);
  const sendWaveSummary      = useCallback((data) =>          send("wave_summary",      data),                                             [send]);
  const sendSaveState        = useCallback((state) =>         send("save_state",       { state }),                                         [send]);
  const sendAllegianceChange = useCallback((buildingId, allegiance) => send("allegiance_change", { buildingId, allegiance }),              [send]);
  const sendBuildingUpgrade  = useCallback((buildingId, upgradeTier, maxHp, hp) =>
                                                              send("building_upgrade", { buildingId, upgradeTier, maxHp, hp }),            [send]);
  const sendBuildingSell     = useCallback((buildingId) =>    send("building_sell",    { buildingId }),                                    [send]);

  return {
    sendP1Move, sendP2Move,
    sendBuildingPlace, sendBuildingRepair, sendWorkerAssign,
    sendEnemyUpdate, sendBuildingHealth, sendUnitUpdate, sendGoldUpdate,
    sendPhaseChange, sendPlayerReady, sendCountdown,
    sendGameOver, sendRestart, sendChat, sendRevive, sendPing, sendWaveSummary,
    sendAllegianceChange, sendSaveState, sendBuildingUpgrade, sendBuildingSell,
  };
}