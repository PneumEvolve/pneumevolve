// src/Pages/DeadMiles/useDeadMilesRoom.js
// WebSocket multiplayer hook — same pattern as useStrongholdRoom.
// Solo play: just don't call this (or pass roomId = null).

import { useEffect, useRef, useCallback } from "react";

const WS_BASE = import.meta.env.VITE_WS_URL || "wss://your-render-app.onrender.com";

export function useDeadMilesRoom(roomId, handlers) {
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
      const url   = `${WS_BASE}/deadmiles/ws/${roomId}?token=${token}`;

      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        connectedRef.current = true;
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
          // Connection lifecycle
          case "connected":            h.onConnected?.(msg);           break;
          case "partner_connected":    h.onPartnerConnected?.(msg);    break;
          case "partner_disconnected": h.onPartnerDisconnected?.(msg); break;

          // Player movement
          case "p1_move":              h.onP1Move?.(msg);              break;
          case "p2_move":              h.onP2Move?.(msg);              break;

          // Vehicle
          case "vehicle_update":       h.onVehicleUpdate?.(msg);       break;
          case "vehicle_damage":       h.onVehicleDamage?.(msg);       break;
          case "vehicle_repair":       h.onVehicleRepair?.(msg);       break;  // NEW

          // World state sync
          case "zombie_update":        h.onZombieUpdate?.(msg);        break;
          case "item_pickup":          h.onItemPickup?.(msg);          break;
          case "building_search":      h.onBuildingSearch?.(msg);      break;
          case "barricade_place":      h.onBarricadePlace?.(msg);      break;
          case "barricade_damage":     h.onBarricadeDamage?.(msg);     break;
          case "door_update":          h.onDoorUpdate?.(msg);          break;

          // Needs sync
          case "needs_update":         h.onNeedsUpdate?.(msg);         break;

          // Survivors
          case "survivor_found":       h.onSurvivorFound?.(msg);       break;
          case "survivor_assign":      h.onSurvivorAssign?.(msg);      break;

          // Farming
          case "crop_plant":           h.onCropPlant?.(msg);           break;
          case "crop_ready":           h.onCropReady?.(msg);           break;
          case "crop_harvest":         h.onCropHarvest?.(msg);         break;

          // Day/night
          case "phase_change":         h.onPhaseChange?.(msg);         break;

          // Map fragment — broadcast so P2 sees the compass arrow too
          case "map_fragment":         h.onMapFragment?.(msg);         break;  // NEW

          // Meta
          case "player_ready":         h.onPlayerReady?.(msg);         break;
          case "game_over":            h.onGameOver?.(msg);            break;
          case "chat":                 h.onChat?.(msg);                break;
          case "ping":                 h.onPing?.(msg);                break;

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

  // ── Core send ──────────────────────────────────────────────────────────────
  const send = useCallback((event, payload = {}) => {
    const msg = { event, ...payload };
    if (connectedRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      pendingRef.current.push(msg);
    }
  }, []);

  // ── Typed senders ──────────────────────────────────────────────────────────

  const sendP1Move    = useCallback((x, y, facing, inVehicle) =>
    send("p1_move", { x, y, facing, inVehicle }), [send]);

  const sendP2Move    = useCallback((x, y, facing, inVehicle) =>
    send("p2_move", { x, y, facing, inVehicle }), [send]);

  const sendVehicleUpdate = useCallback((x, y, facing, hp, fuel, driver = null, passenger = null) =>
    send("vehicle_update", { x, y, facing, hp, fuel, driver, passenger }), [send]);

  const sendVehicleDamage = useCallback((hp) =>
    send("vehicle_damage", { hp }), [send]);

  // NEW: Vehicle repair — broadcast new HP so partner sees the change
  const sendVehicleRepair = useCallback((hp) =>
    send("vehicle_repair", { hp }), [send]);

  const sendZombieUpdate = useCallback((zombies) =>
    send("zombie_update", { zombies: zombies.map(z => ({
      id: z.id, x: z.x, y: z.y, hp: z.hp, state: z.state, dead: z.dead,
    })) }), [send]);

  const sendItemPickup = useCallback((itemId) =>
    send("item_pickup", { itemId }), [send]);

  const sendBuildingSearch = useCallback((buildingId, gained, foundSurvivor) =>
    send("building_search", { buildingId, gained, foundSurvivor }), [send]);

  const sendBarricadePlace  = useCallback((buildingId, hp) =>
    send("barricade_place", { buildingId, hp }), [send]);

  const sendBarricadeDamage = useCallback((buildingId, hp) =>
    send("barricade_damage", { buildingId, hp }), [send]);

  const sendDoorUpdate = useCallback((buildingId, doorId, open, hp, broken) =>
    send("door_update", { buildingId, doorId, open, hp, broken }), [send]);

  const sendNeedsUpdate = useCallback((food, water, sleep, hp) =>
    send("needs_update", { food, water, sleep, hp }), [send]);

  const sendSurvivorFound  = useCallback((survivor) =>
    send("survivor_found", { survivor }), [send]);

  const sendSurvivorAssign = useCallback((survivorId, to) =>
    send("survivor_assign", { survivorId, to }), [send]);

  const sendCropPlant   = useCallback((crop) =>    send("crop_plant",   { crop }),    [send]);
  const sendCropReady   = useCallback((cropId) =>   send("crop_ready",   { cropId }),  [send]);
  const sendCropHarvest = useCallback((cropId) =>   send("crop_harvest", { cropId }),  [send]);

  const sendPhaseChange = useCallback((phase, dayNumber) =>
    send("phase_change", { phase, dayNumber }), [send]);

  // NEW: Map fragment — broadcast so P2 gets the compass arrow too
  const sendMapFragment = useCallback(() =>
    send("map_fragment", {}), [send]);

  const sendPlayerReady = useCallback((role) =>   send("player_ready", { role }),    [send]);
  const sendGameOver    = useCallback((score) =>  send("game_over",    { score }),   [send]);
  const sendChat        = useCallback((text, from) => send("chat",     { text, from }), [send]);
  const sendPing        = useCallback((x, y, from) =>  send("ping",    { x, y, from }), [send]);

  return {
    sendP1Move, sendP2Move,
    sendVehicleUpdate, sendVehicleDamage, sendVehicleRepair,
    sendZombieUpdate,
    sendItemPickup, sendBuildingSearch,
    sendBarricadePlace, sendBarricadeDamage, sendDoorUpdate,
    sendNeedsUpdate,
    sendSurvivorFound, sendSurvivorAssign,
    sendCropPlant, sendCropReady, sendCropHarvest,
    sendPhaseChange,
    sendMapFragment,
    sendPlayerReady, sendGameOver, sendChat, sendPing,
  };
}