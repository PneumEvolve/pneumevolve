// src/Pages/Arcade/net/useArcadeWorld.js
//
// Shared, saved world for farm-style games. Either player can play solo; the
// world is saved on the room, and whoever opens the room later picks it up.
//
// How it works:
//   • The LIVE HOST (whoever connected first — net.amHost) owns the world.
//     First host in loads it from the server (or makes a fresh one).
//   • Every change is an ACTION run through your reducer:
//         reducer(world, action) → newWorld        (pure! return the same object for "no change")
//     action.t  = world-clock time stamped by the host  (use this, never Date.now(), inside the reducer)
//     action.by = user id of the player who did it
//   • Host applies actions (its own + the guest's) and broadcasts them with a
//     sequence number; the guest runs the same reducer to stay in sync. A gap
//     or reconnect triggers a full resync.
//   • Host autosaves every 15s, when the tab is hidden, and when leaving.
//   • Host leaves → server promotes the other player, who keeps playing from
//     their live copy and takes over saving. No pause.
//   • Offline time (crops growing while nobody's on): store timestamps in the
//     world and work out growth from now(); or pass onLoad(world, nowMs) to
//     catch the world up when it's loaded from the server.
//
// Usage:
//   const W = useArcadeWorld(net, room.id, { reducer, initWorld });
//   if (!W.ready) return <Loading/>;
//   W.dispatch({ type: "plant", i: 4, kind: "tulip" });
//   const grown = W.now() - plot.at > growTime;

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/env";
import { useArcadeEvent } from "./useArcadeRoom";

const REQUEST_RETRY_MS = 1500;
const HOST_CLAIM_MS    = 6000;   // no world from the host this long → take over hosting
const KEEPALIVE_LIMIT  = 60_000;   // browsers cap keepalive bodies at 64KB

export function useArcadeWorld(net, roomId, { reducer, initWorld, onLoad, autosaveMs = 15000 }) {
  const cfg = useRef({});
  cfg.current = { reducer, initWorld, onLoad };

  const netRef = useRef(net);
  netRef.current = net;
  const isHost = !!net.amHost;
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  const [world,     setWorldState] = useState(null);
  const [ready,     setReady]      = useState(false);
  const [saveState, setSaveState]  = useState("idle");   // idle | saving | saved | error
  const [savedAt,   setSavedAt]    = useState(null);
  const [syncedFor, setSyncedFor]  = useState(null);     // connId our copy was last fully synced on

  const worldRef   = useRef(null);
  const readyRef   = useRef(false);
  const versionRef = useRef(0);       // last server version we know about
  const seqRef     = useRef(0);       // action sequence number
  const dirtyRef   = useRef(false);
  const savingRef  = useRef(false);
  const offsetRef  = useRef(0);       // world clock = Date.now() + offset (keeps time consistent across hosts)

  const setWorld = useCallback((w) => { worldRef.current = w; setWorldState(w); }, []);
  const markReady = useCallback(() => {
    if (!readyRef.current) { readyRef.current = true; setReady(true); }
  }, []);
  const now = useCallback(() => Date.now() + offsetRef.current, []);

  // ── Host → guest: full copy ────────────────────────────────────────────────
  const sendFull = useCallback(() => {
    if (!isHostRef.current || !readyRef.current) return;
    netRef.current.send("world_full", {
      world: worldRef.current, seq: seqRef.current, v: versionRef.current, ht: now(),
    });
  }, [now]);

  // ── Host: load from server ─────────────────────────────────────────────────
  const loadFromServer = useCallback(async () => {
    try {
      const { data } = await api.get(`/arcade/rooms/${roomId}/world`);
      if (!isHostRef.current) return;                 // lost host while loading — guest path takes over
      let w = data.world ?? cfg.current.initWorld();
      if (cfg.current.onLoad) w = cfg.current.onLoad(w, Date.now()) ?? w;
      versionRef.current = data.version ?? 0;
      offsetRef.current = 0;
      seqRef.current = 0;
      setWorld(w);
      setSavedAt(data.saved_at ? Date.parse(data.saved_at) : null);
      if (!data.world) dirtyRef.current = true;       // brand-new world: save it soon
      markReady();
      sendFull();
    } catch (e) {
      console.warn("[arcade] couldn't load world, retrying", e?.message);
      setSaveState("error");
      setTimeout(() => { if (isHostRef.current && !readyRef.current) loadFromServerRef.current(); }, 3000);
    }
  }, [roomId, setWorld, markReady, sendFull]);
  const loadFromServerRef = useRef(loadFromServer);
  loadFromServerRef.current = loadFromServer;

  // ── Host: save ─────────────────────────────────────────────────────────────
  const save = useCallback(async (attempt = 0) => {
    if (!isHostRef.current || !readyRef.current || !dirtyRef.current || savingRef.current) return;
    savingRef.current = true;
    dirtyRef.current = false;
    setSaveState("saving");
    try {
      const { data } = await api.put(`/arcade/rooms/${roomId}/world`, {
        world: worldRef.current, base_version: versionRef.current,
      });
      versionRef.current = data.version;
      setSavedAt(Date.now());
      setSaveState("saved");
      netRef.current.send("world_saved", { v: data.version });
    } catch (e) {
      const v = e?.response?.data?.detail?.version;
      dirtyRef.current = true;
      if (e?.response?.status === 409 && typeof v === "number" && attempt < 2) {
        // The previous host's last save landed after we took over. Our live copy
        // already includes everything it broadcast, so it's the newest — save over it.
        versionRef.current = v;
        savingRef.current = false;
        return saveRef.current(attempt + 1);
      }
      console.warn("[arcade] world save failed, will retry", e?.message);
      setSaveState("error");
    } finally {
      savingRef.current = false;
    }
  }, [roomId]);
  const saveRef = useRef(save);
  saveRef.current = save;

  // Last-chance save when the tab hides/closes (keepalive survives page unload).
  const saveOnExit = useCallback(() => {
    if (!isHostRef.current || !readyRef.current || !dirtyRef.current) return;
    const body = JSON.stringify({ world: worldRef.current, base_version: versionRef.current });
    if (body.length > KEEPALIVE_LIMIT) { saveRef.current(); return; }
    dirtyRef.current = false;
    const token = localStorage.getItem("access_token");
    fetch(`${String(API_URL).replace(/\/$/, "")}/arcade/rooms/${roomId}/world`, {
      method: "PUT", keepalive: true, credentials: "include", body,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => {
        versionRef.current = d.version;
        setSavedAt(Date.now());
        netRef.current.send("world_saved", { v: d.version });
      })
      .catch(() => { dirtyRef.current = true; });
  }, [roomId]);

  // ── Host: apply an action ──────────────────────────────────────────────────
  const applyAsHost = useCallback((action) => {
    const stamped = { ...action, t: now() };
    const prev = worldRef.current;
    const next = cfg.current.reducer(prev, stamped);
    if (next === prev) return false;
    seqRef.current += 1;
    setWorld(next);
    dirtyRef.current = true;
    netRef.current.send("world_applied", { action: stamped, seq: seqRef.current, v: versionRef.current, ht: now() });
    return true;
  }, [now, setWorld]);

  // ── Public: do something to the world ──────────────────────────────────────
  const dispatch = useCallback((action) => {
    const n = netRef.current;
    if (!readyRef.current || n.status !== "open") return false;
    if (isHostRef.current) return applyAsHost({ ...action, by: action.by ?? n.userId });
    n.send("world_action", { action: { ...action, by: n.userId } });
    return true;
  }, [applyAsHost]);

  // ── Becoming host ──────────────────────────────────────────────────────────
  const wasHostRef = useRef(false);
  useEffect(() => {
    if (!isHost) { wasHostRef.current = false; return; }
    if (wasHostRef.current) return;
    wasHostRef.current = true;
    if (readyRef.current) {
      // Took over from the previous host — carry on from our live copy.
      dirtyRef.current = true;
      saveRef.current();
      sendFull();
    } else {
      loadFromServerRef.current();
    }
  }, [isHost, sendFull]);

  // ── Guest: ask the host for a full copy until we have one for this connection
  useEffect(() => {
    if (isHost || net.status !== "open" || !net.connId || syncedFor === net.connId) return;
    const ask = () => netRef.current.send("world_request", {}, { volatile: true });
    ask();
    const id = setInterval(ask, REQUEST_RETRY_MS);
    // Nobody answered: the "host" is a dead connection (a phone tab asleep in the
    // background, or a tab whose game crashed). Ask the server to make us host
    // instead, so we load the world ourselves rather than waiting forever.
    const claim = setTimeout(() => {
      if (!readyRef.current && !isHostRef.current) netRef.current.send("host_claim", {});
    }, HOST_CLAIM_MS);
    return () => { clearInterval(id); clearTimeout(claim); };
  }, [isHost, net.status, net.connId, syncedFor]);

  // ── Network in ─────────────────────────────────────────────────────────────
  useArcadeEvent(net, "world_full", (m) => {
    if (isHostRef.current || !m.world) return;
    seqRef.current = m.seq ?? 0;
    if (m.v != null) versionRef.current = m.v;
    if (m.ht) offsetRef.current = m.ht - Date.now();
    setWorld(m.world);
    markReady();
    setSyncedFor(netRef.current.connId);
  });

  useArcadeEvent(net, "world_applied", (m) => {
    if (isHostRef.current || !readyRef.current || !m.action) return;
    if (m.seq !== seqRef.current + 1) { setSyncedFor(null); return; }   // missed something → resync
    const next = cfg.current.reducer(worldRef.current, m.action);
    seqRef.current = m.seq;
    if (m.v != null) versionRef.current = m.v;
    if (m.ht) offsetRef.current = m.ht - Date.now();
    if (next !== worldRef.current) setWorld(next);
  });

  useArcadeEvent(net, "world_saved", (m) => {
    if (isHostRef.current) return;
    if (m.v != null) versionRef.current = m.v;
    setSavedAt(Date.now());
  });

  useArcadeEvent(net, "world_action", (m) => {
    if (isHostRef.current && readyRef.current && m.action) applyAsHost(m.action);
  });

  const onPartnerHere = useCallback(() => { if (isHostRef.current) sendFull(); }, [sendFull]);
  useArcadeEvent(net, "world_request",     onPartnerHere);
  useArcadeEvent(net, "partner_connected", onPartnerHere);
  useArcadeEvent(net, "hello",             onPartnerHere);

  // ── Autosave + exit saves (host only) ──────────────────────────────────────
  useEffect(() => {
    if (!isHost) return;
    const id = setInterval(() => saveRef.current(), autosaveMs);
    return () => clearInterval(id);
  }, [isHost, autosaveMs]);

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "hidden") saveOnExit(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", saveOnExit);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", saveOnExit);
      saveOnExit();                                     // leaving the game
    };
  }, [saveOnExit]);

  return {
    world,
    ready,
    isHost,
    canAct: ready && net.status === "open",
    dispatch,
    now,
    saveState,
    savedAt,
    saveNow: () => { dirtyRef.current = true; return saveRef.current(); },
  };
}