// Creature Fair screen. See fairSim.js for the rules.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { C } from "../../../ui";
import { typeLabel } from "../eggs";
import { useMini } from "./useMini";
import { mulberry } from "./rng";
import { newFair, fairAct, fairTick, zoneFor, trickSpeed, SCRUB_SECS, TRICK_SECS, JUDGE_SECS, SCRUB_SPOTS, SCRUB_FULL, TRICKS, RIBBON_NAMES } from "./fairSim";
import { Shell, btn, bigBtn, Section, Pic, CreaturePick, Ribbon, P_COLORS } from "./MiniShell";

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default function CreatureFair({ net, host, world, W, myId, partnerId, partnerHere, nameOf, onExit }) {
  const worldRef = useRef(world); worldRef.current = world;
  const m = useMini({
    net, host, prefix: "cf", partnerHere,
    make: () => newFair(Math.floor(Math.random() * 1e9), world.fairWins || 0),
    onAct: (st, s, i) => fairAct(st, s, i, worldRef.current),
    onTick: (st, dt) => fairTick(st, dt, worldRef.current),
    onEnd: (st) => { if (!st.result?.quit) W.dispatch({ type: "fair_end", entries: st.result.entries.filter(e => !e.npc).map(e => ({ cid: e.cid, place: e.place, ribbons: [e.ribbon, ...e.extras], coins: e.coins })) }); },
  });
  const { st, mySlot, me, act, update } = m;
  const pName = cap(nameOf(partnerId));
  const leave = () => { if (host && st && st.phase !== "end" && st.phase !== "lobby") act({ k: "quit" }); onExit(); };

  if (!st) return <Shell title="Creature Fair" onLeave={onExit}><div style={{ padding: 30, color: C.dim }}>Joining {pName} at the fair…</div></Shell>;
  const myC = me?.cid ? world.creatures[me.cid] : null;
  const other = st.players[1 - mySlot];
  const otherC = other?.cid ? world.creatures[other.cid] : null;

  if (st.phase === "lobby") {
    const ready = st.players.every(p => !p || p.cid);
    return (
      <Shell title="Creature Fair" onLeave={onExit} bg="#1a1530">
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, color: C.dim, maxWidth: 640 }}>
            Show off one of your creatures. First <b style={{ color: C.text }}>scrub it clean</b>, then <b style={{ color: C.text }}>do a trick</b>. The judges add that up with how happy it is, its Care, and what makes it special: purebred, a rare mix, golden, or a rare egg. Three of the neighbours' creatures are entered too.
          </div>
          <Section title="Pick your creature">
            <CreaturePick world={world} userId={myId} picked={me?.cid} taken={other?.cid ? [other.cid] : []} onPick={(cid) => act({ k: "pick", cid })}
              sub={(c) => `happy ${Math.round(c.happy)} · Care ${c.skills?.care || 1}${c.traits?.rare ? " · golden" : ""}`} />
          </Section>
          {st.players[1] && <div style={{ fontSize: 13, color: other?.cid ? C.good : C.dim }}>{pName} {other?.cid ? `is entering ${otherC?.name || "a creature"}` : "is picking a creature…"} (you're up against each other too!)</div>}
          <Section title="Also entered">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {st.rivals.map((r, i) => <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800 }}><Pic c={r} size={36} />{r.name}</span>)}
            </div>
          </Section>
        </div>
        <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", justifyContent: "flex-end", alignItems: "center" }}>
          {host ? <button data-go disabled={!ready} onClick={() => act({ k: "start" })} style={bigBtn(ready)}>Start the show!</button>
            : <span style={{ fontSize: 13, color: C.dim }}>{me?.cid ? `Waiting for ${pName} to start the show…` : "Pick a creature!"}</span>}
        </div>
      </Shell>
    );
  }

  if (st.phase === "scrub") return (
    <Shell title={`Creature Fair · scrub-a-dub! ${Math.ceil(SCRUB_SECS - st.t)}s`} onLeave={leave} bg="#1a1530">
      <Timer frac={1 - st.t / SCRUB_SECS} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: 10, flexWrap: "wrap" }}>
        {myC ? <Scrub key={me.cid} c={myC} seed={st.seed + mySlot * 101} t={st.t} done={me.scrub || 0} onClean={(n) => update({ scrub: n })} /> : <div style={{ color: C.dim }}>Watching…</div>}
        {otherC && <Mini c={otherC} label={`${pName}: ${other.scrub || 0} spots`} />}
      </div>
      <div style={{ textAlign: "center", padding: 6, fontWeight: 800, color: C.dim }}>Tap the mud spots to scrub them off! ({SCRUB_FULL} for full marks)</div>
    </Shell>
  );

  if (st.phase === "trick") return (
    <Shell title="Creature Fair · show us a trick!" onLeave={leave} bg="#1a1530">
      <Timer frac={1 - st.t / TRICK_SECS} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: 10, flexWrap: "wrap" }}>
        {myC ? <Trick c={myC} tricks={me.tricks || []} onTap={(acc) => update({ tricks: [...(me.tricks || []), acc] })} /> : <div style={{ color: C.dim }}>Watching…</div>}
        {otherC && <Mini c={otherC} label={`${pName}: ${(other.tricks || []).length}/${TRICKS} tricks`} />}
      </div>
    </Shell>
  );

  const entries = st.result?.entries || [];
  if (st.phase === "judge") {
    const shown = Math.min(entries.length, Math.floor((st.t / (JUDGE_SECS - 1.2)) * entries.length) + 1);
    const order = entries.slice().reverse();                         // last place first, winner last
    return (
      <Shell title="Creature Fair · the judges decide…" onLeave={leave} bg="#1a1530">
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          {order.slice(0, shown).reverse().map(e => <EntryRow key={(e.cid || e.name) + e.place} e={e} you={e.slot === mySlot} pName={pName} big={e.place === 1 && shown === entries.length} />)}
        </div>
      </Shell>
    );
  }

  // end
  const mine = entries.find(e => e.slot === mySlot);
  return (
    <Shell title="Creature Fair" onLeave={onExit} bg="#1a1530">
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
        {st.result?.quit ? <div style={{ fontSize: 20, fontWeight: 900 }}>The show was called off.</div> : mine && (
          <>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#ffd65a" }}>{mine.place === 1 ? `${mine.name} wins the fair!` : mine.place <= 3 ? `${mine.name} came ${["", "1st", "2nd", "3rd"][mine.place]}!` : `${mine.name} had a great time!`}</div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", justifyContent: "center" }}>
              {[mine.ribbon, ...mine.extras].map((r, i) => <span key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: 11, fontWeight: 800 }}><Ribbon color={r} size={i ? 34 : 48} />{RIBBON_NAMES[r]}</span>)}
            </div>
            <div style={{ color: "#ffd65a", fontWeight: 900, fontSize: 20 }}>+{mine.coins} coins</div>
            <div style={{ fontSize: 12, color: C.dim }}>{mine.name} loved the attention: happier, and a little Care practice. Ribbons show on its card.</div>
          </>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
          {entries.map(e => <EntryRow key={(e.cid || e.name) + e.place} e={e} you={e.slot === mySlot} pName={pName} small />)}
        </div>
        <button onClick={onExit} style={bigBtn(true)}>Back to the farm</button>
      </div>
    </Shell>
  );
}

function Timer({ frac }) {
  return <div style={{ height: 8, background: "rgba(255,255,255,0.08)" }}><div style={{ height: "100%", width: `${Math.max(0, frac) * 100}%`, background: frac < 0.25 ? C.bad : "#b88aff" }} /></div>;
}
function Mini({ c, label }) {
  return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: 0.85, fontSize: 12, fontWeight: 800 }}><Pic c={c} size={80} />{label}</div>;
}

// ── Scrub: mud spots pop up on the creature; tap them off ─────────────────────
function Scrub({ c, seed, t, done, onClean }) {
  const spots = useMemo(() => {
    const r = mulberry(seed);
    return Array.from({ length: SCRUB_SPOTS }, (_, i) => ({ id: i, x: 16 + r() * 68, y: 20 + r() * 64, s: 34 + r() * 22, at: i * (SCRUB_SECS - 3.5) / SCRUB_SPOTS, rot: r() * 360 }));
  }, [seed]);
  const [gone, setGone] = useState(() => new Set());
  const [pops, setPops] = useState([]);
  const clean = (sp) => {
    if (gone.has(sp.id)) return;
    const g = new Set(gone); g.add(sp.id); setGone(g); onClean(g.size);
    setPops(ps => [...ps.slice(-6), { id: sp.id + "_" + Date.now(), x: sp.x, y: sp.y }]);
  };
  const size = Math.max(180, Math.min(300, (typeof window !== "undefined" ? window.innerHeight : 600) - 170));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: size, height: size, borderRadius: 24, background: "radial-gradient(circle, #3a2f60, #241c40)" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Pic c={c} size={size * 0.9} /></div>
        {spots.filter(sp => t >= sp.at && !gone.has(sp.id)).map(sp => (
          <button key={sp.id} data-mud={sp.id} onPointerDown={() => clean(sp)} style={{
            position: "absolute", left: `${sp.x}%`, top: `${sp.y}%`, width: sp.s, height: sp.s * 0.8, marginLeft: -sp.s / 2, marginTop: -sp.s * 0.4, padding: 0, border: "none", cursor: "pointer",
            borderRadius: "45% 55% 50% 40%", background: "radial-gradient(circle at 35% 35%, #8a6438, #5e3f1e)", transform: `rotate(${sp.rot}deg)`, boxShadow: "0 0 0 3px rgba(94,63,30,0.35)", touchAction: "manipulation",
          }} />
        ))}
        {pops.map(p => <span key={p.id} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: 30, height: 30, marginLeft: -15, marginTop: -15, borderRadius: "50%", border: "3px solid #bfe9ff", animation: "cfPop 0.5s ease-out forwards", pointerEvents: "none" }} />)}
      </div>
      <div style={{ fontWeight: 900, fontSize: 16 }}>{done} spot{done === 1 ? "" : "s"} scrubbed</div>
      <style>{"@keyframes cfPop { from { transform: scale(0.4); opacity: 1 } to { transform: scale(1.8); opacity: 0 } }"}</style>
    </div>
  );
}

// ── Trick: a hoop slides back and forth; stop it in the green ─────────────────
function Trick({ c, tricks, onTap }) {
  const barRef = useRef(null), posRef = useRef(0.5);
  const zone = zoneFor(c.skills?.care || 1);
  const [say, setSay] = useState(null);
  const n = tricks.length, doneAll = n >= TRICKS;
  useEffect(() => {
    if (doneAll) return;
    let raf = 0; const t0 = performance.now(), speed = trickSpeed(n);
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const u = (now - t0) / 1000 * speed;
      posRef.current = 0.5 + 0.5 * Math.sin(u * Math.PI);
      if (barRef.current) barRef.current.style.left = `calc(${posRef.current * 100}% - 14px)`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [n, doneAll]);
  const tap = () => {
    if (doneAll) return;
    const d = Math.abs(posRef.current - 0.5);
    const acc = d <= zone / 4 ? 1 : d <= zone / 2 ? 0.65 : d <= zone ? 0.3 : 0;
    setSay(acc === 1 ? "Perfect!" : acc >= 0.65 ? "Nice!" : acc > 0 ? "Close!" : "Oops!");
    onTap(acc);
  };
  useEffect(() => {
    const k = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); tap(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });
  const moves = ["cfHop", "cfSpin", "cfFlip"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "min(92vw, 520px)" }}>
      <div key={n} style={{ animation: n ? `${moves[n % 3]} 0.6s ease-out` : "none" }}><Pic c={c} size={Math.max(90, Math.min(170, (typeof window !== "undefined" ? window.innerHeight : 600) - 260))} /></div>
      <div style={{ fontSize: 22, fontWeight: 900, height: 28, color: say === "Perfect!" ? "#ffd65a" : say === "Oops!" ? C.bad : C.good }}>{say}</div>
      <div onPointerDown={tap} data-trick style={{ position: "relative", width: "100%", height: 54, borderRadius: 27, background: "rgba(255,255,255,0.08)", cursor: "pointer", touchAction: "manipulation", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(0.5 - zone) * 100}%`, width: `${zone * 200}%`, background: "rgba(127,220,138,0.35)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(0.5 - zone / 2) * 100}%`, width: `${zone * 100}%`, background: "rgba(127,220,138,0.5)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(0.5 - zone / 4) * 100}%`, width: `${zone * 50}%`, background: "#ffd65a" }} />
        {!doneAll && <div ref={barRef} style={{ position: "absolute", top: 7, width: 28, height: 40, borderRadius: "50%", border: "5px solid #ff6b9a", boxSizing: "border-box" }} />}
      </div>
      <div style={{ display: "flex", gap: 6 }}>{Array.from({ length: TRICKS }, (_, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 8, background: i < n ? (tricks[i] >= 1 ? "#ffd65a" : tricks[i] > 0.5 ? "#7fdc8a" : tricks[i] > 0 ? "#6fa8ff" : "#ff5d73") : "rgba(255,255,255,0.15)" }} />)}</div>
      <div style={{ fontSize: 13, color: C.dim, fontWeight: 700 }}>{doneAll ? "All done! Waiting for the judges…" : "Tap (or press Space) when the hoop is in the middle. Higher Care = bigger green zone."}</div>
      <style>{"@keyframes cfHop { 40% { transform: translateY(-40px) } } @keyframes cfSpin { 50% { transform: rotate(180deg) scale(1.1) } 100% { transform: rotate(360deg) } } @keyframes cfFlip { 50% { transform: translateY(-30px) scaleX(-1) } }"}</style>
    </div>
  );
}

function EntryRow({ e, you, pName, big, small }) {
  const who = e.npc ? "neighbour" : you ? "you" : pName;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: small ? "4px 10px" : "8px 14px", borderRadius: 14, width: "min(94vw, 460px)", boxSizing: "border-box",
      background: you ? "rgba(255,214,90,0.1)" : "rgba(255,255,255,0.04)", border: `2px solid ${you ? "#ffd65a" : big ? "#b88aff" : "transparent"}`, transform: big ? "scale(1.04)" : "none" }}>
      <span style={{ fontWeight: 900, fontSize: small ? 14 : 18, width: 28 }}>{e.place}</span>
      <Ribbon color={e.ribbon} size={small ? 20 : 28} />
      <Pic c={e} size={small ? 32 : 48} />
      <span style={{ flex: 1, textAlign: "left" }}>
        <span style={{ display: "block", fontWeight: 900 }}>{e.name} <span style={{ fontSize: 11, color: e.npc ? C.dim : P_COLORS[e.slot] }}>{who}</span></span>
        {e.parts && !small && <span style={{ display: "block", fontSize: 10, color: C.dim }}>scrub {e.parts.scrub} · trick {e.parts.trick} · happy {e.parts.happy} · care {e.parts.care} · special {e.parts.special}</span>}
      </span>
      <span style={{ fontWeight: 900, fontSize: small ? 14 : 20, color: "#ffd65a" }}>{e.score}</span>
    </div>
  );
}