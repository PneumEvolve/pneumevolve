// src/Pages/Arcade/net/useArcadeSave.js
//
// Account-level save for one game. Same idea as Homestead's usePlayerState
// (instant localStorage cache + debounced server PUT), but keyed by
// user + game instead of room, and with one generic blob instead of six fields.
//
//   const { data, update, loaded, syncState } =
//     useArcadeSave("creature-crashers", { unlocked: ["wolf"], xp: 0 });
//
//   update({ xp: data.xp + 10 });                 // shallow-merge a patch
//   update(prev => ({ xp: prev.xp + 10 }));       // or derive from latest
//
// Load order: cache shows instantly → server replaces it (server is truth),
// unless this device has unsynced offline changes newer than the server copy.

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/env";

const SAVE_DEBOUNCE_MS = 1500;
const RETRY_MS         = 10000;

// Cache per signed-in account, so Bash's save never shows on Dad's login
// if they share a device.
function tokenSubject() {
  try {
    const part = localStorage.getItem("access_token")?.split(".")[1];
    if (!part) return "anon";
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return String(json.sub ?? json.user_id ?? json.id ?? "anon");
  } catch { return "anon"; }
}
const cacheKey   = (gameId) => `arcade_save_${tokenSubject()}_${gameId}`;
const readCache  = (gameId) => { try { return JSON.parse(localStorage.getItem(cacheKey(gameId)) || "null"); } catch { return null; } };
const writeCache = (gameId, entry) => { try { localStorage.setItem(cacheKey(gameId), JSON.stringify(entry)); } catch {} };

export function useArcadeSave(gameId, defaults = {}) {
  const defaultsRef = useRef(defaults);
  const [data, setData] = useState(() => ({ ...defaults, ...(readCache(gameId)?.data ?? {}) }));
  const dataRef  = useRef(data);
  const dirtyRef = useRef(false);
  const timerRef = useRef(null);
  const flushRef = useRef(async () => {});

  const [loaded,    setLoaded]    = useState(false);
  const [syncState, setSyncState] = useState("idle"); // idle | saving | saved | offline

  const apply = useCallback((next) => {
    dataRef.current = next;
    setData(next);
  }, []);

  // ── Push to server ─────────────────────────────────────────────────────────
  const flush = useCallback(async () => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    const sending = dataRef.current;
    setSyncState("saving");
    try {
      const { data: srv } = await api.put(`/arcade/saves/${gameId}`, { data: sending });
      writeCache(gameId, {
        data: dataRef.current,
        dirty: dirtyRef.current,                 // still dirty if edited mid-request
        localTime: Date.parse(srv?.updated_at) || Date.now(),
      });
      setSyncState("saved");
    } catch (e) {
      console.warn("[arcade] save failed, will retry", e?.message);
      dirtyRef.current = true;
      setSyncState("offline");
      timerRef.current = setTimeout(() => flushRef.current(), RETRY_MS);
    }
  }, [gameId]);
  useEffect(() => { flushRef.current = flush; }, [flush]);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const cached = readCache(gameId);
    setLoaded(false);

    api.get(`/arcade/saves/${gameId}`)
      .then(({ data: srv }) => {
        if (cancelled) return;
        const serverTime = srv?.updated_at ? Date.parse(srv.updated_at) : 0;
        if (cached?.dirty && (cached.localTime ?? 0) > serverTime) {
          // Changed offline after the last server save — keep ours and push it up.
          apply({ ...defaultsRef.current, ...(cached.data ?? {}) });
          dirtyRef.current = true;
          flushRef.current();
        } else if (!dirtyRef.current) {
          const merged = { ...defaultsRef.current, ...(srv?.data ?? {}) };
          apply(merged);
          writeCache(gameId, { data: merged, dirty: false, localTime: serverTime });
        }
        setSyncState("saved");
      })
      .catch(() => { if (!cancelled) setSyncState("offline"); })
      .finally(() => { if (!cancelled) setLoaded(true); });

    return () => { cancelled = true; };
  }, [gameId, apply]);

  // ── Local edits ────────────────────────────────────────────────────────────
  const update = useCallback((patchOrFn) => {
    const prev  = dataRef.current;
    const patch = typeof patchOrFn === "function" ? patchOrFn(prev) : patchOrFn;
    if (!patch) return;
    const next = { ...prev, ...patch };
    apply(next);
    dirtyRef.current = true;
    writeCache(gameId, { data: next, dirty: true, localTime: Date.now() });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => flushRef.current(), SAVE_DEBOUNCE_MS);
  }, [gameId, apply]);

  // ── Tablet closed / tab switched: fire a keepalive save ────────────────────
  useEffect(() => {
    const sendNow = () => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      clearTimeout(timerRef.current);
      const token = localStorage.getItem("access_token");
      fetch(`${String(API_URL).replace(/\/$/, "")}/arcade/saves/${gameId}`, {
        method: "PUT",
        keepalive: true,
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ data: dataRef.current }),
      }).then(r => { if (!r.ok) dirtyRef.current = true; })
        .catch(() => { dirtyRef.current = true; });
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") sendNow(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", sendNow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", sendNow);
    };
  }, [gameId]);

  // Flush whatever's pending when the game unmounts.
  useEffect(() => () => { flushRef.current(); }, []);

  return { data, update, loaded, syncState, flush };
}
