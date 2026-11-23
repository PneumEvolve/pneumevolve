// src/Pages/Arcade/net/useArcadeRoom.js
//
// One WebSocket per play session, shared by the whole game.
// Unlike useHearthroom there's no big event switch: games call
//   net.send("anything", { ...payload })
//   net.on("anything", handler)       → returns an unsubscribe fn
// and the server relays it to the other player untouched.
//
// Built-in events you can listen for:
//   "connected"            { role, peer_count, conn_id, host_conn, host_user }
//   "partner_connected"    { role }
//   "partner_disconnected" {}
//   "host"                 { host_conn, host_user }   (live host changed)
//   "hello" / "hello_back" (presence handshake — handled for you)
//
// Seat vs host:
//   room.role (p1/p2) = your seat (p1 made the room). Use it for sides/colours.
//   net.amHost        = you're the LIVE host: whoever connected first. Changes
//                       if the host leaves. Persistent-world games use this.
//
// Usage:
//   const net = useArcadeRoom(room.id);
//   useArcadeEvent(net, "move", (msg) => { ... });
//   net.send("move", { x, y }, { volatile: true });   // volatile = drop if offline

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/env";

const WS_BASE = String(import.meta.env.VITE_WS_URL || API_URL || "")
  .replace(/^http/, "ws")
  .replace(/\/$/, "");

const MAX_FAILED_OPENS = 8;   // ~40s of backoff — covers a Render cold start
const MAX_QUEUE        = 50;

export function useArcadeRoom(roomId) {
  const wsRef        = useRef(null);
  const listenersRef = useRef(new Map());   // event -> Set<fn>
  const queueRef     = useRef([]);          // messages sent before the socket opened

  const [status,        setStatus]        = useState("connecting"); // connecting | open | reconnecting | failed
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [error,         setError]         = useState(null);
  const [retryKey,      setRetryKey]      = useState(0);
  const [connId,        setConnId]        = useState(null);   // this connection's id
  const [hostConn,      setHostConn]      = useState(null);   // live host's connection id
  const [userId,        setUserId]        = useState(null);

  const emit = useCallback((event, msg) => {
    const fire = (set) => {
      if (!set) return;
      for (const fn of [...set]) {
        try { fn(msg); } catch (e) { console.error(`[arcade] "${event}" handler threw`, e); }
      }
    };
    fire(listenersRef.current.get(event));
    fire(listenersRef.current.get("*"));
  }, []);

  const on = useCallback((event, fn) => {
    let set = listenersRef.current.get(event);
    if (!set) { set = new Set(); listenersRef.current.set(event, set); }
    set.add(fn);
    return () => set.delete(fn);
  }, []);

  const send = useCallback((event, payload = {}, { volatile = false } = {}) => {
    const msg = JSON.stringify({ ...payload, event });
    const ws  = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    } else if (!volatile && queueRef.current.length < MAX_QUEUE) {
      queueRef.current.push(msg);
    }
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setStatus("connecting");
    setRetryKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (!roomId) return;

    let dead         = false;
    let timer        = null;
    let failedOpens  = 0;
    let triedRefresh = false;

    function fail(message) {
      setStatus("failed");
      setError(message);
    }

    function connect() {
      if (dead) return;
      const token = localStorage.getItem("access_token") || "";
      const ws = new WebSocket(`${WS_BASE}/arcade/ws/${roomId}?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;
      let opened = false;

      ws.onopen = () => {
        opened = true;
        failedOpens = 0;
        triedRefresh = false;
        setStatus("open");
        setError(null);
        for (const m of queueRef.current) ws.send(m);
        queueRef.current = [];
        // Announce ourselves so the partner marks us present even if it
        // missed partner_connected (e.g. it was mid-reconnect).
        ws.send(JSON.stringify({ event: "hello" }));
      };

      ws.onmessage = ({ data }) => {
        let msg;
        try { msg = JSON.parse(data); } catch { return; }
        if (!msg?.event) return;

        switch (msg.event) {
          case "connected":
            if (msg.peer_count >= 2) setPartnerOnline(true);
            setConnId(msg.conn_id ?? null);
            setHostConn(msg.host_conn ?? null);
            setUserId(msg.user_id ?? null);
            break;
          case "host":                 setHostConn(msg.host_conn ?? null); break;
          case "partner_connected":    setPartnerOnline(true); break;
          case "hello":                setPartnerOnline(true); ws.send(JSON.stringify({ event: "hello_back" })); break;
          case "hello_back":           setPartnerOnline(true); break;
          case "partner_disconnected": setPartnerOnline(false); break;
          default: break;
        }
        emit(msg.event, msg);
      };

      ws.onclose = async (e) => {
        if (wsRef.current === ws) wsRef.current = null;
        setPartnerOnline(false);
        setConnId(null);       // not host while disconnected — the server may promote the partner
        if (dead) return;

        if (e.code === 4003) return fail("This room is closed, or you're not in it.");
        if (!opened) failedOpens++;

        // Expired token? Hit an authed endpoint once — api.ts refreshes on 401.
        if ((e.code === 4001 || !opened) && !triedRefresh) {
          triedRefresh = true;
          try {
            await api.get(`/arcade/rooms/${roomId}`);
          } catch (err) {
            const s = err?.response?.status;
            if (dead) return;
            if (s === 403 || s === 404) return fail("This room is closed, or you're not in it.");
          }
          if (dead) return;
        }

        if (failedOpens >= MAX_FAILED_OPENS) return fail("Can't reach the game server.");

        setStatus("reconnecting");
        const delay = opened ? 500 : Math.min(8000, 1000 * 2 ** Math.max(0, failedOpens - 1));
        timer = setTimeout(connect, delay);
      };

      ws.onerror = () => { /* onclose follows and handles everything */ };
    }

    connect();

    return () => {
      dead = true;
      clearTimeout(timer);
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) ws.close();
    };
  }, [roomId, retryKey, emit]);

  const amHost = status === "open" && !!connId && connId === hostConn;

  return useMemo(
    () => ({ status, partnerOnline, error, send, on, retry, connId, amHost, userId }),
    [status, partnerOnline, error, send, on, retry, connId, amHost, userId],
  );
}

// Subscribe to one event with an always-fresh handler (no stale closures).
export function useArcadeEvent(net, event, handler) {
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; });
  const on = net?.on;
  useEffect(() => {
    if (!on) return;
    return on(event, (msg) => handlerRef.current(msg));
  }, [on, event]);
}