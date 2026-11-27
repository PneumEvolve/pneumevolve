// Shared plumbing for the small signpost games (Market Rush, Creature Fair, Critter Races).
//
// One player hosts (the one who started it). The host keeps the real state and sends it out
// about 10 times a second. Each player runs their own hands-on part locally (tapping, jumping)
// and sends just their own player record; the host merges it in. Anything that changes the
// whole game (start, pick a creature, next round) goes through act(), which only the host applies.
//
//   const m = useMini({ net, host, prefix: "mr", make, onAct, onTick, onEnd });
//   m.st      the state to draw (my own player record is always my latest local copy)
//   m.mySlot  0 = host, 1 = partner
//   m.me      my player record
//   m.update(patch)   change my player record
//   m.act(i)          ask the host to do something (start, pick, …)
//
// make() → { phase, players: [p0, null], … }. onAct(st, slot, i) → true if it changed anything.
// onTick(st, dt) runs on the host every frame → true if the phase changed (sends right away).
// onEnd(st) runs once on the host when phase becomes "end" (dispatch farm rewards there).
import { useCallback, useEffect, useRef, useState } from "react";
import { useArcadeEvent } from "../../../net/useArcadeRoom";

export function useMini({ net, host, prefix, make, onAct, onTick, onEnd, partnerHere, hz = 10 }) {
  const mySlot = host ? 0 : 1;
  const stRef = useRef(null);
  const mineRef = useRef(null);                 // guest: my own record, kept locally so it never jumps back
  const endSent = useRef(false);
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick(n => (n + 1) % 1e9), []);
  const live = useRef({});
  live.current = { net, host, onAct, onTick, onEnd, partnerHere };

  if (host && !stRef.current) stRef.current = make();

  const send = useCallback((volatile) => {
    const L = live.current;
    if (L.host && stRef.current) L.net.send(`${prefix}_snap`, { s: stRef.current }, { volatile });
  }, [prefix]);
  const changed = useCallback(() => {
    const L = live.current, st = stRef.current;
    if (!L.host || !st) return;
    if (st.phase === "end" && !endSent.current) { endSent.current = true; L.onEnd?.(st); }
    send(false); rerender();
  }, [send, rerender]);

  // host: partner's own record and requests
  useArcadeEvent(net, `${prefix}_me`, (m) => {
    const st = stRef.current;
    if (!live.current.host || !st || !st.players[1]) return;
    st.players[1] = { ...st.players[1], ...m.p };
  });
  useArcadeEvent(net, `${prefix}_act`, (m) => {
    const st = stRef.current;
    if (!live.current.host || !st) return;
    if (m.i?.k === "join") {
      if (!st.players[1] && st.phase === "lobby") { const r = live.current.onAct(st, 1, m.i); if (r) changed(); }
      else send(false);
      return;
    }
    if (live.current.onAct(st, 1, m.i)) changed(); else send(false);
  });
  // guest: snapshots
  useArcadeEvent(net, `${prefix}_snap`, (m) => {
    if (live.current.host) return;
    stRef.current = m.s;
    rerender();
  });
  // guest: knock until the host lets us in
  useEffect(() => {
    if (host) return;
    const knock = () => { const st = stRef.current; if (!st || (st.phase === "lobby" && !st.players[1])) net.send(`${prefix}_act`, { i: { k: "join" } }); };
    knock();
    const id = setInterval(knock, 1500);
    return () => clearInterval(id);
  }, [host, net, prefix]);
  // host: partner left while we were still in the lobby → back to solo
  useEffect(() => {
    const st = stRef.current;
    if (host && st && !partnerHere && st.players[1] && st.phase === "lobby") { st.players[1] = null; changed(); }
  }, [partnerHere, host, changed]);

  // host loop
  useEffect(() => {
    if (!host) return;
    let raf = 0, last = performance.now(), lastSnap = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const st = stRef.current;
      if (!st) return;
      const L = live.current;
      if (L.onTick && L.onTick(st, dt)) changed();
      else if (now - lastSnap > 1000 / hz) { lastSnap = now; if (L.net.partnerOnline) send(true); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [host, hz, send, changed]);
  // everyone: redraw the UI ~12 times a second
  useEffect(() => { const id = setInterval(rerender, 80); return () => clearInterval(id); }, [rerender]);

  const update = useCallback((patch) => {
    const L = live.current, st = stRef.current;
    if (!st) return;
    if (L.host) { st.players[0] = { ...st.players[0], ...patch }; return; }
    mineRef.current = { ...(mineRef.current || {}), ...patch };
    L.net.send(`${prefix}_me`, { p: patch });
  }, [prefix]);
  const act = useCallback((i) => {
    const L = live.current;
    if (L.host) { if (stRef.current && L.onAct(stRef.current, 0, i)) changed(); }
    else L.net.send(`${prefix}_act`, { i });
  }, [prefix, changed]);

  let st = stRef.current;
  if (st && !host && st.players[1] && mineRef.current) {
    // keep my own fast-changing fields (but let the host reset them for a new round)
    const p = st.players[1];
    const mine = (mineRef.current.round ?? p.round) === p.round ? mineRef.current : null;
    if (!mine) mineRef.current = null;
    st = { ...st, players: [st.players[0], { ...p, ...(mine || {}) }] };
  }
  if (typeof window !== "undefined" && window.__ARCADE_DEBUG__) window.__ARCADE_DEBUG__[prefix] = { st: stRef, act, update };
  return { st, mySlot, me: st?.players?.[mySlot] || null, update, act, rerender };
}

export { mulberry } from "./rng";