// Hill Climb Rally screen. Rules and physics in hillSim.js, drawing in drawHill.js.
import React, { useEffect, useMemo, useRef } from "react";
import { C } from "../../../ui";
import { useMini } from "../minis/useMini";
import { Shell, btn, bigBtn, Section, Pic, CreaturePick, Ribbon, P_COLORS } from "../minis/MiniShell";
import {
  MAPS, makeTerrain, makeCoins, newCart, stepCart, cartStats, newHill, hillAct, hillTick, npcX, DT, COUNTDOWN, RACE_MAX, CART_TRAIT,
} from "./hillSim";
import { drawHill, drawProgress, makeCamera, moveCamera } from "./drawHill";

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const ORD = ["", "1st", "2nd", "3rd", "4th", "5th"];

export default function HillClimb({ net, host, world, W, myId, partnerId, partnerHere, nameOf, onExit }) {
  const worldRef = useRef(world); worldRef.current = world;
  const m = useMini({
    net, host, prefix: "hc", partnerHere, hz: 15,
    make: () => newHill(Math.floor(Math.random() * 1e9)),
    onAct: hillAct,
    onTick: (st, dt) => hillTick(st, dt, worldRef.current),
    onEnd: (st) => { if (!st.result?.quit) W.dispatch({ type: "hill_end", map: st.result.map, entries: st.result.entries.filter(e => !e.npc).map(e => ({ cid: e.cid, place: e.place, coins: e.prize, time: e.time, ribbon: e.ribbon })) }); },
  });
  const { st, mySlot, me, act, update } = m;
  const pName = cap(nameOf(partnerId));
  const leave = () => { if (host && st && st.phase !== "end" && st.phase !== "lobby") act({ k: "quit" }); onExit(); };

  if (!st) return <Shell title="Hill Climb Rally" onLeave={onExit}><div style={{ padding: 30, color: C.dim }}>Joining {pName} at the hills…</div></Shell>;
  const other = st.players[1 - mySlot];
  const myC = me?.cid ? world.creatures[me.cid] : null;
  const M = MAPS[st.map];

  if (st.phase === "lobby") {
    const ready = st.players.every(p => !p || p.cid);
    return (
      <Shell title="Hill Climb Rally" onLeave={onExit} bg="#12202a">
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, color: C.dim, maxWidth: 680 }}>
            Race your creature's cart over the hills to the finish! <b style={{ color: C.text }}>Hold GAS</b> to go (Right / D / W), <b style={{ color: C.text }}>BRAKE</b> to slow down or back up (Left / A / S).
            <b style={{ color: C.text }}> In the air, GAS tips your nose up and BRAKE tips it down</b>: land on your wheels! Bump your head and you crash: you'll be put back a little way and keep going.
          </div>
          <Section title="Pick your driver">
            <CreaturePick world={world} userId={myId} picked={me?.cid} taken={other?.cid ? [other.cid] : []} onPick={(cid) => act({ k: "pick", cid })}
              sub={(c) => `Cart: ${CART_TRAIT[c.species] || ""}`} />
          </Section>
          <Section title={`Track · ${M.name}`}>
            <div style={{ fontSize: 13, color: C.dim }}>{M.desc} {world.hillBest?.[st.map] ? `Your best: ${world.hillBest[st.map].toFixed(1)}s.` : ""}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: C.dim, alignItems: "center" }}>Racing against: {st.npcs.map((n, i) => <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 800, color: C.text }}><Pic c={n} size={28} />{n.name}</span>)}</div>
            <div style={{ fontSize: 11, color: C.dim }}>1st place: 90 coins, plus {M.coinsPer} for every coin you grab on the way.</div>
          </Section>
          {st.players[1] && <div style={{ fontSize: 13, color: other?.cid ? C.good : C.dim }}>{pName} {other?.cid ? "is in the cart and ready" : "is picking a driver…"}. Race each other!</div>}
        </div>
        <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", justifyContent: "flex-end", alignItems: "center" }}>
          {host ? <button data-go disabled={!ready} onClick={() => act({ k: "start" })} style={bigBtn(ready)}>Start your engines!</button>
            : <span style={{ fontSize: 13, color: C.dim }}>{me?.cid ? `Waiting for ${pName} to start…` : "Pick a driver!"}</span>}
        </div>
      </Shell>
    );
  }

  if (st.phase === "end") {
    const entries = st.result?.entries || [];
    const mine = entries.find(e => e.slot === mySlot);
    return (
      <Shell title="Hill Climb Rally" onLeave={onExit} bg="#12202a">
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          {st.result?.quit ? <div style={{ fontSize: 20, fontWeight: 900 }}>Race called off.</div> : mine && (
            <>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#ffd65a" }}>{mine.place === 1 ? `${mine.name} wins!` : `${mine.name} came ${ORD[mine.place]}!`}</div>
              <Ribbon color={mine.ribbon} size={48} />
              <div style={{ fontSize: 15 }}>{mine.time ? `${mine.time.toFixed(1)} seconds` : "Didn't reach the finish in time"} · {mine.crashes} crash{mine.crashes === 1 ? "" : "es"} · {mine.coins} coins grabbed</div>
              <div style={{ color: "#ffd65a", fontWeight: 900, fontSize: 20 }}>+{mine.prize} coins</div>
            </>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
            {entries.map(e => (
              <div key={(e.cid || e.name) + e.place} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 12px", borderRadius: 12, width: "min(94vw, 420px)", boxSizing: "border-box", background: e.slot === mySlot ? "rgba(255,214,90,0.1)" : "rgba(255,255,255,0.04)", border: `2px solid ${e.slot === mySlot ? "#ffd65a" : "transparent"}` }}>
                <span style={{ fontWeight: 900, width: 30 }}>{ORD[e.place]}</span>
                <Ribbon color={e.ribbon} size={20} />
                <Pic c={e} size={32} />
                <span style={{ flex: 1, textAlign: "left", fontWeight: 900 }}>{e.name} <span style={{ fontSize: 11, color: e.npc ? C.dim : P_COLORS[e.slot] }}>{e.npc ? "neighbour" : e.slot === mySlot ? "you" : pName}</span></span>
                <span style={{ fontWeight: 800, color: C.dim }}>{e.time ? `${e.time.toFixed(1)}s` : "—"}</span>
              </div>
            ))}
          </div>
          <button onClick={onExit} style={bigBtn(true)}>Back to the farm</button>
        </div>
      </Shell>
    );
  }

  return <Drive st={st} mySlot={mySlot} me={me} myC={myC} world={world} update={update} leave={leave} pName={pName} />;
}

// ── Driving ───────────────────────────────────────────────────────────────────
function Drive({ st, mySlot, me, myC, world, update, leave, pName }) {
  const canvasRef = useRef(null), barRef = useRef(null);
  const T = useMemo(() => makeTerrain(st.map), [st.map]);
  const coins = useMemo(() => makeCoins(st.map, st.seed), [st.map, st.seed]);
  const stats = useMemo(() => cartStats(myC), [myC?.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const cart = useRef(null);
  if (!cart.current) cart.current = newCart(T);
  const cam = useRef(makeCamera());
  const keys = useRef({ gas: false, brake: false }), touch = useRef({ gas: false, brake: false });
  const clock = useRef({ base: 0, at: performance.now() });
  const live = useRef({});
  live.current = { st, update, myC, world };
  useEffect(() => { clock.current = { base: st.phase === "race" ? st.t : -(COUNTDOWN - st.t), at: performance.now() }; }, [st.t, st.phase]);
  const now = () => clock.current.base + (performance.now() - clock.current.at) / 1000;

  useEffect(() => {
    const set = (e, v) => {
      const k = e.key;
      if (k === "ArrowRight" || k === "d" || k === "D" || k === "ArrowUp" || k === "w" || k === "W") { keys.current.gas = v; e.preventDefault(); }
      if (k === "ArrowLeft" || k === "a" || k === "A" || k === "ArrowDown" || k === "s" || k === "S") { keys.current.brake = v; e.preventDefault(); }
    };
    const dn = (e) => set(e, true), up = (e) => set(e, false), blur = () => { keys.current = { gas: false, brake: false }; touch.current = { gas: false, brake: false }; };
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, []);

  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0, lastSend = 0;
    const loop = (ms) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (ms - last) / 1000); last = ms;
      const L = live.current, c = cart.current, t = now();
      if (L.st.phase === "race" && L.myC && t >= 0) {
        acc += dt;
        const input = { gas: keys.current.gas || touch.current.gas, brake: keys.current.brake || touch.current.brake };
        let n = 0;
        while (acc >= DT && n++ < 12) { stepCart(c, stats, T, input, t, coins); acc -= DT; }
        if (ms - lastSend > 66 || (c.done && !L.st.players[mySlot]?.done)) {
          lastSend = ms;
          L.update({ x: Math.round(c.x), y: Math.round(c.y), a: Math.round(c.a * 100) / 100, done: c.done, time: c.time, crashes: c.crashes, coins: c.coins, crashed: c.crashed > 0 ? 1 : 0 });
        }
      }
      const cv = canvasRef.current;
      if (cv) moveCamera(cam.current, c, cv.clientWidth, cv.clientHeight, dt);
      const others = L.st.players.map((p, slot) => (p && slot !== mySlot ? { ...p, c: L.world.creatures[p.cid], color: P_COLORS[slot] } : null)).filter(Boolean);
      drawHill(cv, { T, cam: cam.current, me: c, meStats: stats, myC: L.myC, others, npcs: L.st.npcs, coins, t, phase: L.st.phase, color: P_COLORS[mySlot] });
      drawProgress(barRef.current, T, [
        ...L.st.npcs.map(nn => ({ x: L.st.phase === "race" ? npcX(nn, Math.max(0, t)) : 0, color: "rgba(201,160,255,0.9)" })),
        ...others.map(o => ({ x: o.x || 0, color: o.color })),
        ...(L.myC ? [{ x: c.x, color: P_COLORS[mySlot], big: true }] : []),
      ]);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [T, coins, stats, mySlot]);   // eslint-disable-line react-hooks/exhaustive-deps

  const c = cart.current, t = now();
  const hold = (k, v) => (e) => { e.preventDefault(); if (v) { try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* synthetic or gone */ } } touch.current[k] = v; };
  const pedal = (k, label, col) => (
    <button data-pedal={k} onPointerDown={hold(k, true)} onPointerUp={hold(k, false)} onPointerCancel={hold(k, false)} onLostPointerCapture={() => { touch.current[k] = false; }} onContextMenu={e => e.preventDefault()}
      style={{ width: 120, height: 96, borderRadius: 22, border: "none", fontFamily: "inherit", fontWeight: 900, fontSize: 22, color: "#1a1300", background: col, boxShadow: "0 5px 0 rgba(0,0,0,0.3)", pointerEvents: "auto", touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}>{label}</button>
  );
  const recent = (k) => c.fx.some(f => f.k === k && t - f.at < 1.2);
  return (
    <Shell title={`Hill Climb Rally · ${MAPS[st.map].name}`} onLeave={leave} bg="#12202a"
      right={<span style={{ display: "flex", gap: 12, fontWeight: 900 }}>
        <span style={{ color: "#ffd65a" }}>{c.coins} coins</span>
        <span style={{ color: c.crashes ? "#ff9aa8" : C.dim }}>{c.crashes} crash{c.crashes === 1 ? "" : "es"}</span>
        <span style={{ color: "#fff" }}>{st.phase === "race" ? `${Math.max(0, Math.min(RACE_MAX, c.time ?? t)).toFixed(1)}s` : ""}</span>
      </span>}>
      <canvas ref={barRef} style={{ width: "100%", height: 22, display: "block", background: "rgba(0,0,0,0.25)" }} />
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />
        {st.phase === "count" && <Big text={Math.max(1, Math.ceil(COUNTDOWN - st.t))} color="#ffd65a" />}
        {st.phase === "race" && t < 1 && <Big text="GO!" color="#7fdc8a" />}
        {c.crashed > 0 && <Big text="CRASH!" color="#ff5d73" sub={c.push ? "The neighbours give you a push…" : "Back in a sec…"} />}
        {recent("push") && !(c.crashed > 0) && <Big text="Here's a push!" color="#6fd3ff" small />}
        {recent("flip") && <Big text="FLIP!" color="#ffd65a" small />}
        {c.done && <Big text={`Finished! ${c.time?.toFixed(1)}s`} color="#ffd65a" sub={st.players.some(p => p && !p.done) ? `waiting for ${pName}…` : ""} />}
        {!myC && <div style={{ position: "absolute", top: 12, left: 0, right: 0, textAlign: "center", color: "#fff", fontWeight: 800 }}>Watching the race</div>}
        {myC && !c.done && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 12, display: "flex", justifyContent: "space-between", padding: "0 14px", pointerEvents: "none" }}>
            {pedal("brake", "BRAKE", "#ff9a8a")}
            {pedal("gas", "GAS", "#7fdc8a")}
          </div>
        )}
      </div>
    </Shell>
  );
}
function Big({ text, color, sub, small }) {
  return (
    <div style={{ position: "absolute", top: small ? "18%" : "30%", left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
      <div style={{ fontSize: small ? 30 : 60, fontWeight: 900, color, WebkitTextStroke: "2px rgba(0,0,0,0.45)", textShadow: "0 4px 0 rgba(0,0,0,0.3)" }}>{text}</div>
      {sub && <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", textShadow: "0 2px 3px rgba(0,0,0,0.6)" }}>{sub}</div>}
    </div>
  );
}