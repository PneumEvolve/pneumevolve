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
          case "p2_damage":            h.onP2Damage?.(msg);            break;  // host → P2: zombie damage to P2/their vehicle

          // World state sync
          case "zombie_update":        h.onZombieUpdate?.(msg);        break;
          case "item_pickup":          h.onItemPickup?.(msg);          break;
          case "building_search":      h.onBuildingSearch?.(msg);      break;
          case "barricade_place":      h.onBarricadePlace?.(msg);      break;
          case "barricade_damage":     h.onBarricadeDamage?.(msg);     break;
          case "door_update":          h.onDoorUpdate?.(msg);          break;

          // Inventory sync (full snapshot on every mutation)
          case "inventory_update":     h.onInventoryUpdate?.(msg);     break;

          // Loot pickups — items + fuel, not just building id
          case "loot_pickup":          h.onLootPickup?.(msg);          break;

          // Survivor position sync (every tick from host)
          case "survivor_positions":   h.onSurvivorPositions?.(msg);   break;

          // Turret state full snapshot
          case "turret_states":        h.onTurretStates?.(msg);        break;

          // Needs sync
          case "needs_update":         h.onNeedsUpdate?.(msg);         break;

          case "sleep_request":       h.onSleepRequest?.(msg);       break;
          case "sleep_response":      h.onSleepResponse?.(msg);      break;
          case "fast_sleep_start":    h.onFastSleepStart?.(msg);     break;
          case "fast_sleep_cancel":   h.onFastSleepCancel?.(msg);    break;

          // Survivors
          case "survivor_found":       h.onSurvivorFound?.(msg);       break;
          case "survivor_assign":      h.onSurvivorAssign?.(msg);      break;
          case "survivor_command":  h.onSurvivorCommand?.(msg); break;

          // Farming
          case "crop_plant":           h.onCropPlant?.(msg);           break;
          case "crop_ready":           h.onCropReady?.(msg);           break;
          case "crop_harvest":         h.onCropHarvest?.(msg);         break;

          // Day/night
          case "phase_change":         h.onPhaseChange?.(msg);         break;

          // Map fragment — broadcast so P2 sees the compass arrow too
          case "map_fragment":         h.onMapFragment?.(msg);         break;  // NEW

          // Turrets
          case "turret_place":         h.onTurretPlace?.(msg);         break;
          case "turret_damage":        h.onTurretDamage?.(msg);        break;
          case "turret_repair":        h.onTurretRepair?.(msg);        break;
          case "turret_destroy":       h.onTurretDestroy?.(msg);       break;

          // Convoy vehicles (P1 → P2 position sync)
          case "convoy_vehicle_update": h.onConvoyVehicleUpdate?.(msg); break;

          // Meta
          case "garden_plot_place":  h.onGardenPlotPlace?.(msg);  break;
          case "room_seed_update":   h.onRoomSeedUpdate?.(msg);   break;
          case "restart_request":    h.onRestartRequest?.(msg);   break;
          case "game_over":            h.onGameOver?.(msg);            break;
          case "chat":                 h.onChat?.(msg);                break;
          case "ping":                 h.onPing?.(msg);                break;

          // ── FIX 3: base storage sync — host broadcasts full baseStorage
          // snapshot so P2's BaseView and offline tick use the same data.
          case "base_storage_update":  h.onBaseStorageUpdate?.(msg);   break;
          // Deposit/withdraw: either player can move items between field
          // inventory and baseStorage; partner is notified so UI is consistent.
          case "base_storage_deposit": h.onBaseStorageDeposit?.(msg);  break;
          case "base_storage_withdraw":h.onBaseStorageWithdraw?.(msg); break;

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

  const sendVehicleUpdate = useCallback((vehicleId, x, y, facing, hp, fuel, driver = null, passenger = null) =>
    send("vehicle_update", { vehicleId, x, y, facing, hp, fuel, driver, passenger }), [send]);

  const sendVehicleDamage = useCallback((hp) =>
    send("vehicle_damage", { hp }), [send]);

  // NEW: Vehicle repair — broadcast new HP so partner sees the change
  const sendVehicleRepair = useCallback((vehicleId, hp) =>
    send("vehicle_repair", { vehicleId, hp }), [send]);

  // Host → P2: tell P2 it took zombie damage so P2 (authoritative over its own
  // HP / vehicle HP) can apply it locally. isVehicle=true means damage the named vehicle.
  const sendP2Damage = useCallback((amount, isVehicle = false, vehicleId = null) =>
    send("p2_damage", { amount, isVehicle, vehicleId }), [send]);

  const sendZombieUpdate = useCallback((zombies) =>
    send("zombie_update", { zombies: zombies.map(z => ({
      id: z.id, x: z.x, y: z.y, hp: z.hp, maxHp: z.maxHp, state: z.state, dead: z.dead,
      zombieType: z.type, radius: z.radius,
    })) }), [send]);

  // Broadcast new map seed when P1 restarts/advances level so P2 builds the same world
  const sendRoomSeedUpdate = useCallback((seed, level) =>
    send("room_seed_update", { seed, level }), [send]);

  const sendGardenPlotPlace = useCallback((plot) =>
    send("garden_plot_place", { plot }), [send]);

  const sendInventoryUpdate = useCallback((inventory) =>
    send("inventory_update", { inventory }), [send]);

  const sendLootPickup = useCallback((buildingId, gained, fuelGained) =>
    send("loot_pickup", { buildingId, gained, fuelGained }), [send]);

  const sendSurvivorPositions = useCallback((survivors) =>
    send("survivor_positions", { survivors: survivors.map(sv => ({
      id: sv.id, x: sv.x, y: sv.y, hp: sv.hp, state: sv.state,
    })) }), [send]);

  const sendTurretStates = useCallback((turrets) =>
    send("turret_states", { turrets: turrets.map(t => ({
      id: t.id, hp: t.hp, destroyed: t.destroyed,
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

  const sendNeedsUpdate = useCallback((food, water, sleep, hp, isDowned = false) =>
    send("needs_update", { food, water, sleep, hp, isDowned }), [send]);

  const sendSurvivorFound  = useCallback((survivor, foundBy) =>
    send("survivor_found", { survivor, foundBy, }), [send]);

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

  // Turrets
  const sendTurretPlace   = useCallback((turret) =>      send("turret_place",   { turret }),             [send]);
  const sendTurretDamage  = useCallback((turretId, hp) => send("turret_damage",  { turretId, hp }),       [send]);
  const sendTurretRepair  = useCallback((turretId, hp) => send("turret_repair",  { turretId, hp }),       [send]);
  const sendTurretDestroy = useCallback((turretId) =>     send("turret_destroy", { turretId }),           [send]);

  // Convoy vehicles — P1 broadcasts positions each sync tick so P2 can interpolate
  const sendConvoyUpdate = useCallback((vehicles) =>
    send("convoy_vehicle_update", { vehicles }), [send]);

  const sendPlayerReady = useCallback((role) =>   send("player_ready", { role }),    [send]);
  const sendGameOver    = useCallback((score) =>  send("game_over",    { score }),   [send]);
  const sendChat        = useCallback((text, from) => send("chat",     { text, from }), [send]);
  const sendPing        = useCallback((x, y, from) =>  send("ping",    { x, y, from }), [send]);

  // ── FIX 3: base storage typed senders ─────────────────────────────────────
  // Full snapshot — host sends after any baseTick mutation so P2 stays in sync.
  const sendBaseStorageUpdate = useCallback((storage) =>
    send("base_storage_update", { storage }), [send]);
  // Granular deposit/withdraw — either player triggers these from BaseView or
  // GameView loot pickups. Recipient merges the delta into their local state.
  const sendBaseStorageDeposit = useCallback((items) =>
    send("base_storage_deposit", { items }), [send]);
  const sendBaseStorageWithdraw = useCallback((items) =>
    send("base_storage_withdraw", { items }), [send]);
  const sendSurvivorCommand = useCallback((survivorId, command, assignedTo = null) =>
  send("survivor_command", { survivorId, command, assignedTo }), [send]);



  return {
    sendP1Move, sendP2Move,
    sendVehicleUpdate, sendVehicleDamage, sendVehicleRepair, sendP2Damage,
    sendZombieUpdate,
    sendInventoryUpdate, sendLootPickup,
    sendItemPickup, sendBuildingSearch,
    sendBarricadePlace, sendBarricadeDamage, sendDoorUpdate,
    sendNeedsUpdate,
    sendSurvivorFound, sendSurvivorAssign, sendSurvivorPositions, sendSurvivorCommand,
    sendCropPlant, sendCropReady, sendCropHarvest,
    sendPhaseChange,
    sendMapFragment,
    sendTurretPlace, sendTurretDamage, sendTurretRepair, sendTurretDestroy, sendTurretStates,
    sendConvoyUpdate,
    sendRoomSeedUpdate,
    sendGardenPlotPlace,
    sendPlayerReady, sendGameOver, sendChat, sendPing,
    sendBaseStorageUpdate, sendBaseStorageDeposit, sendBaseStorageWithdraw,
    sendSleepRequest: useCallback(() => send("sleep_request", {}), [send]),
    sendSleepResponse: useCallback((agree) => send("sleep_response", { agree }), [send]),
    sendFastSleepStart: useCallback(() => send("fast_sleep_start", {}), [send]),
    sendFastSleepCancel: useCallback(() => send("fast_sleep_cancel", {}), [send]),
    sendRestartRequest: useCallback((seed, level) => send("restart_request", { seed, level }), [send]),
  };
}