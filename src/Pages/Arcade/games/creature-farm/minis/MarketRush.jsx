// Market Rush screen. See marketSim.js for the rules.
import React from "react";
import { C } from "../../../ui";
import { ITEMS } from "../ranch";
import { ItemIcon } from "../RanchPanel";
import { useMini } from "./useMini";
import { newMarket, marketAct, marketTick, MR_SECS, MR_KINDS, MR_STOCK, MR_MARKUP, sellable } from "./marketSim";
import { Shell, btn, bigBtn, Section, Pic, Stars, P_COLORS } from "./MiniShell";

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default function MarketRush({ net, host, world, W, myId, partnerId, partnerHere, nameOf, onExit }) {
  const m = useMini({
    net, host, prefix: "mr", partnerHere,
    make: () => newMarket(world, Math.floor(Math.random() * 1e9)),
    onAct: marketAct, onTick: marketTick,
    onEnd: (st) => W.dispatch({ type: "market_end", sold: st.result.sold, coins: st.result.coins, served: st.result.served }),
  });
  const { st, mySlot, act } = m;
  const pName = cap(nameOf(partnerId));
  const leave = () => { if (host && st?.phase === "play") act({ k: "quit" }); onExit(); };

  if (!st) return <Shell title="Market Rush" onLeave={onExit}><div style={{ padding: 30, color: C.dim }}>Joining {pName} at the stall…</div></Shell>;

  if (st.phase === "lobby") {
    const all = sellable(world);
    return (
      <Shell title="Market Rush · market day!" onLeave={onExit}>
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, color: C.dim, maxWidth: 640 }}>
            Two minutes behind the stall. Customers come up wanting things from your storage. <b style={{ color: C.text }}>Tap an item to hand it over.</b> It goes to the customer you tapped, or to whoever needs it most.
            Full orders pay {MR_MARKUP}× the stall price, plus tips for being quick. Don't let anyone wait too long!
          </div>
          <Section title={`On the counter · ${Object.keys(st.stock).length}/${MR_KINDS} items (up to ${MR_STOCK} of each)`}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {all.map(k => {
                const on = st.stock[k] != null, n = Math.floor(world.food[k] || 0);
                return (
                  <button key={k} data-stock={k} disabled={!host} onClick={() => act({ k: "stock", item: k, n })} style={btn(on, { padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, opacity: host || on ? 1 : 0.4 })}>
                    <ItemIcon kind={k} size={24} />
                    <span style={{ textAlign: "left" }}>{ITEMS[k].name}<span style={{ display: "block", fontSize: 10, fontWeight: 600, opacity: 0.75 }}>{on ? `${st.stock[k]} out` : `have ${n}`} · {ITEMS[k].price * MR_MARKUP}c each</span></span>
                  </button>
                );
              })}
              {!all.length && <span style={{ fontSize: 12, color: C.dim }}>Your storage is empty. Grow or make something first!</span>}
            </div>
            <div style={{ fontSize: 11, color: C.dim }}>{host ? "Tap to put things out or take them back. Bricks, blankets, lanterns and cake stay home unless you put them out." : `${pName} picks what goes on the counter.`} Anything not sold stays in storage.</div>
          </Section>
          <Section title={`Helpers · ${st.helpers.length}`}>
            {st.helpers.length ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {st.helpers.map(h => <span key={h.cid} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: 6, borderRadius: 10, background: "rgba(255,255,255,0.05)", fontSize: 12, fontWeight: 800 }}><Pic c={h} size={30} />{h.name}<span style={{ color: C.dim, fontWeight: 600 }}>hands one over every {h.every.toFixed(1)}s</span></span>)}
              </div>
            ) : <div style={{ fontSize: 12, color: C.dim }}>Your Haulers come and help at the counter (up to 3). Higher Haul = faster.</div>}
          </Section>
          <div style={{ fontSize: 12, color: st.players[1] ? C.good : C.dim }}>{st.players[1] ? `${host ? pName : "You"} ${host ? "is" : "are"} helping at the stall too: customers come a bit faster.` : partnerHere ? `${pName} can join from the signpost.` : "Running the stall on your own."}</div>
        </div>
        <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", justifyContent: "flex-end", alignItems: "center" }}>
          {host ? <button data-go disabled={!Object.keys(st.stock).length} onClick={() => act({ k: "start" })} style={bigBtn(!!Object.keys(st.stock).length)}>Open the stall!</button>
            : <span style={{ fontSize: 13, color: C.dim }}>Waiting for {pName} to open the stall…</span>}
        </div>
      </Shell>
    );
  }

  if (st.phase === "end") {
    const r = st.result;
    const sold = Object.entries(r.sold).filter(([, n]) => n > 0);
    return (
      <Shell title="Market Rush" onLeave={onExit}>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#ffd65a" }}>{r.stars >= 3 ? "Best market day ever!" : r.stars === 2 ? "Busy day, well done!" : r.stars === 1 ? "Not bad!" : "Phew, what a rush"}</div>
          <Stars n={r.stars} size={40} />
          <div style={{ color: "#ffd65a", fontWeight: 900, fontSize: 22 }}>+{r.coins} coins <span style={{ fontSize: 13, color: C.dim }}>({r.tips} in tips)</span></div>
          <div style={{ fontSize: 14 }}>{r.served} happy customer{r.served === 1 ? "" : "s"}{r.angry ? ` · ${r.angry} gave up waiting` : ""} · best streak {r.best}</div>
          {sold.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>{sold.map(([k, n]) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "4px 8px", borderRadius: 8, background: "rgba(255,255,255,0.06)", fontSize: 13 }}><ItemIcon kind={k} size={18} /> {n} {ITEMS[k].name.toLowerCase()}</span>)}</div>}
          <div style={{ fontSize: 12, color: C.dim }}>Sold items came out of storage; the coins are in the farm's purse.</div>
          <button onClick={onExit} style={bigBtn(true)}>Back to the farm</button>
        </div>
      </Shell>
    );
  }

  // ── Playing ─────────────────────────────────────────────────────────────────
  const frac = st.left / MR_SECS;
  const sel = (slot) => st.players[slot]?.sel;
  const recent = (kind) => st.fx.filter(f => f.kind === kind);
  const iMissed = st.fx.some(f => f.kind === "nope" && f.by === mySlot && st.t - f.at < 0.5);
  return (
    <Shell title="Market Rush" onLeave={leave} bg="#2a1d12"
      right={<span style={{ display: "flex", gap: 12, alignItems: "center", fontWeight: 900 }}>
        {st.streak >= 2 && <span style={{ color: "#ff9ad0" }}>streak {st.streak}</span>}
        <span style={{ color: "#ffd65a" }}>{st.coins} coins</span>
      </span>}>
      <div style={{ height: 8, background: "rgba(255,255,255,0.08)" }}><div style={{ height: "100%", width: `${frac * 100}%`, background: frac < 0.2 ? C.bad : "#ffd65a", transition: "width 0.1s linear" }} /></div>
      {/* customers */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 10, padding: "12px 8px 6px", background: "linear-gradient(#7ec8f0, #bfe6b0 70%, #9ccf7e)", position: "relative", flexWrap: "wrap", alignContent: "flex-end" }}>
        {[0, 1, 2, 3, 4].map(spot => {
          const c = st.customers.find(x => x.spot === spot);
          const paid = recent("paid").find(f => f.spot === spot), huff = recent("huff").find(f => f.spot === spot);
          if (!c) return (
            <div key={spot} style={{ width: 150, minHeight: 170, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18 }}>
              {paid && <span style={{ color: "#a86a00", animation: "mrUp 1.2s ease-out forwards" }}>+{paid.n}</span>}
              {huff && <span style={{ color: "#a33", fontSize: 14 }}>hmph!</span>}
            </div>
          );
          const pFrac = Math.max(0, c.patience / c.max);
          const mine = sel(mySlot) === c.id, theirs = sel(1 - mySlot) === c.id;
          const shake = pFrac < 0.25 ? `translateX(${Math.sin(st.t * 30) * 2}px)` : "none";
          return (
            <button key={spot} data-cust={c.id} onClick={() => act({ k: "sel", id: c.id })} style={{
              width: 150, padding: 6, borderRadius: 14, cursor: "pointer", fontFamily: "inherit", touchAction: "manipulation",
              background: "rgba(255,255,255,0.85)", border: `3px solid ${mine ? P_COLORS[mySlot] : theirs ? P_COLORS[1 - mySlot] : "transparent"}`,
              boxShadow: "0 3px 0 rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transform: shake, color: "#2a1d12",
            }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center", minHeight: 30 }}>
                {Object.entries(c.order).map(([k, q]) => {
                  const got = c.got[k] || 0, done = got >= q;
                  return <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 1, padding: "1px 4px", borderRadius: 8, background: done ? "#c8f0c0" : "#fff3d6", fontSize: 12, fontWeight: 900, opacity: done ? 0.7 : 1 }}><ItemIcon kind={k} size={22} />{got}/{q}</span>;
                })}
              </div>
              <Pic c={c} size={78} />
              <div style={{ width: "100%", height: 7, borderRadius: 4, background: "rgba(0,0,0,0.12)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pFrac * 100}%`, background: pFrac < 0.25 ? "#e0483c" : pFrac < 0.5 ? "#f0a030" : "#4cbf5a" }} />
              </div>
            </button>
          );
        })}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 34, background: "repeating-linear-gradient(90deg, #e04848 0 36px, #fff4e6 36px 72px)", boxShadow: "0 4px 0 rgba(0,0,0,0.12)" }} />
        <div style={{ position: "absolute", top: 34, left: 0, right: 0, height: 12, background: "radial-gradient(circle at 18px 0, #e04848 12px, transparent 13px) 0 0 / 72px 12px repeat-x, radial-gradient(circle at 54px 0, #fff4e6 12px, transparent 13px) 0 0 / 72px 12px repeat-x" }} />
        <div style={{ position: "absolute", top: 54, left: 0, right: 0, textAlign: "center", fontWeight: 900, fontSize: 15, color: "rgba(42,29,18,0.55)", pointerEvents: "none" }}>{st.customers.length ? "Tap a customer, then tap what they want (or just tap the item)" : st.t < 3 ? "Here they come…" : ""}</div>
        {st.helpers.length > 0 && (
          <div style={{ position: "absolute", left: 8, bottom: 6, display: "flex", gap: 2 }}>
            {st.helpers.map(h => <div key={h.cid} style={{ transform: recent("help").some(f => f.cid === h.cid) ? "translateY(-8px)" : "none", transition: "transform 0.15s" }}><Pic c={h} size={40} /></div>)}
          </div>
        )}
      </div>
      {/* counter */}
      <div style={{ background: "repeating-linear-gradient(90deg, #9b6a40 0 40px, #8d5f38 40px 80px)", borderTop: "6px solid #6b4426", padding: 10, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", transform: iMissed ? `translateX(${Math.sin(st.t * 60) * 3}px)` : "none" }}>
        {Object.entries(st.stock).map(([k, n]) => (
          <button key={k} data-bin={k} disabled={n <= 0} onClick={() => act({ k: "give", item: k })} style={{
            width: 86, height: 86, borderRadius: 14, cursor: n > 0 ? "pointer" : "default", fontFamily: "inherit", touchAction: "manipulation",
            background: n > 0 ? "#f6e3c0" : "rgba(0,0,0,0.25)", border: "3px solid #6b4426", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: "#2a1d12", opacity: n > 0 ? 1 : 0.45,
          }}>
            <ItemIcon kind={k} size={44} />
            <span style={{ fontWeight: 900, fontSize: 14 }}>{n}</span>
          </button>
        ))}
      </div>
      <style>{"@keyframes mrUp { from { transform: translateY(0); opacity: 1 } to { transform: translateY(-40px); opacity: 0 } }"}</style>
    </Shell>
  );
}