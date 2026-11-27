// Market Rush screen. See marketSim.js for the rules.
import React from "react";
import { C } from "../../../ui";
import { ITEMS } from "../ranch";
import { ItemIcon } from "../RanchPanel";
import { useMini } from "./useMini";
import { newMarket, marketAct, marketTick, MR_KINDS, MR_STOCK, MR_MARKUP, MR_HEARTS, sellable, comboMul, leftToSell } from "./marketSim";
import { Shell, btn, bigBtn, Section, Pic, Stars, P_COLORS } from "./MiniShell";

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const CSS = `
@keyframes mrUp { from { transform: translateY(0); opacity: 1 } to { transform: translateY(-60px); opacity: 0 } }
@keyframes mrIn { 0% { transform: translateY(60px) scale(0.6); opacity: 0 } 70% { transform: translateY(-8px) scale(1.04); opacity: 1 } 100% { transform: none } }
@keyframes mrCoin { 0% { transform: translate(0,0) scale(1); opacity: 1 } 100% { transform: translate(var(--dx), -110px) scale(0.5); opacity: 0 } }
@keyframes mrBanner { 0% { transform: translate(-50%,-50%) scale(0.3) rotate(-8deg); opacity: 0 } 15% { transform: translate(-50%,-50%) scale(1.15) rotate(3deg); opacity: 1 } 30% { transform: translate(-50%,-50%) scale(1) rotate(0) } 80% { opacity: 1 } 100% { transform: translate(-50%,-80%) scale(1); opacity: 0 } }
@keyframes mrPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.12) } }
@keyframes mrBin { 0% { transform: scale(1) } 40% { transform: scale(0.88) } 100% { transform: scale(1) } }
@keyframes mrGlow { 0%,100% { box-shadow: 0 0 10px 2px rgba(255,214,90,0.7) } 50% { box-shadow: 0 0 22px 6px rgba(255,214,90,1) } }
@keyframes mrHuff { 0% { transform: none; opacity: 1 } 100% { transform: translateX(80px) rotate(10deg); opacity: 0 } }
`;

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
    const total = leftToSell(st);
    return (
      <Shell title="Market Rush · market day!" onLeave={onExit}>
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, color: C.dim, maxWidth: 680 }}>
            <b style={{ color: C.text }}>Sell everything you put out!</b> Tap an item to hand it to a customer. The more you sell, the busier it gets. Fill orders in a row for a <b style={{ color: "#ff8a3c" }}>combo</b>, look out for golden <b style={{ color: "#ffd65a" }}>VIPs</b> (double pay, and they give back a heart), and get ready for <b style={{ color: "#ff5d73" }}>rush hour</b>.
            If {MR_HEARTS} customers walk off in a huff, the stall closes early. Sell out for a 20% bonus.
          </div>
          <Section title={`On the counter · ${total} item${total === 1 ? "" : "s"} to sell · ${Object.keys(st.stock).length}/${MR_KINDS} kinds`}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {all.map(k => {
                const on = st.stock[k] != null, have = Math.floor(world.food[k] || 0);
                return (
                  <div key={k} style={{ ...btn(on, { padding: "6px 8px", display: "flex", alignItems: "center", gap: 6, cursor: "default", opacity: host || on ? 1 : 0.45 }) }}>
                    <button data-stock={k} disabled={!host} onClick={() => act({ k: "stock", item: k, have })} style={{ all: "unset", cursor: host ? "pointer" : "default", display: "flex", alignItems: "center", gap: 6 }}>
                      <ItemIcon kind={k} size={26} />
                      <span>{ITEMS[k].name}<span style={{ display: "block", fontSize: 10, fontWeight: 600, opacity: 0.75 }}>{on ? `selling ${st.stock[k]} of ${have}` : `have ${have} · tap to sell`}</span></span>
                    </button>
                    {on && host && (
                      <span style={{ display: "flex", gap: 3, marginLeft: 4 }}>
                        <button onClick={() => act({ k: "amount", item: k, d: -5, have })} style={btn(false, { padding: "2px 7px", fontSize: 12, background: "rgba(0,0,0,0.25)", color: "#1a1300", border: "none" })}>−5</button>
                        <button onClick={() => act({ k: "amount", item: k, d: 5, have })} style={btn(false, { padding: "2px 7px", fontSize: 12, background: "rgba(0,0,0,0.25)", color: "#1a1300", border: "none" })}>+5</button>
                      </span>
                    )}
                  </div>
                );
              })}
              {!all.length && <span style={{ fontSize: 12, color: C.dim }}>Your storage is empty. Grow or make something first!</span>}
            </div>
            <div style={{ fontSize: 11, color: C.dim }}>{host ? `Up to ${MR_STOCK} of each. More on the counter = a longer, crazier day and more coins.` : `${pName} picks what goes on the counter.`} Anything not sold stays in storage. Customers pay about {MR_MARKUP}× the stall price before combos, VIPs and tips.</div>
          </Section>
          <Section title={`Helpers · ${st.helpers.length}`}>
            {st.helpers.length ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {st.helpers.map(h => <span key={h.cid} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: 6, borderRadius: 10, background: "rgba(255,255,255,0.05)", fontSize: 12, fontWeight: 800 }}><Pic c={h} size={30} />{h.name}<span style={{ color: C.dim, fontWeight: 600 }}>hands one over every {h.every.toFixed(1)}s</span></span>)}
              </div>
            ) : <div style={{ fontSize: 12, color: C.dim }}>Your Haulers come and help at the counter (up to 3). Higher Haul = faster.</div>}
          </Section>
          <div style={{ fontSize: 12, color: st.players[1] ? C.good : C.dim }}>{st.players[1] ? `Two at the counter: an extra customer spot, and they come a bit faster.` : partnerHere ? `${pName} can join from the signpost.` : "Running the stall on your own."}</div>
        </div>
        <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", justifyContent: "flex-end", alignItems: "center" }}>
          {host ? <button data-go disabled={!total} onClick={() => act({ k: "start" })} style={bigBtn(!!total)}>Open the stall!</button>
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
        <style>{CSS}</style>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: r.why === "soldout" ? "#ffd65a" : C.text, animation: r.why === "soldout" ? "mrPulse 1s ease-in-out infinite" : "none" }}>
            {r.why === "soldout" ? "SOLD OUT!" : r.why === "closed" ? "The stall closed early" : "Stall closed"}
          </div>
          <Stars n={r.stars} size={42} />
          <div style={{ color: "#ffd65a", fontWeight: 900, fontSize: 24 }}>+{r.coins} coins</div>
          {r.bonus > 0 && <div style={{ fontSize: 13, color: C.good, fontWeight: 800 }}>includes a {r.bonus}-coin sold-out bonus</div>}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>
            <span>{r.served} happy customers</span><span style={{ color: "#ff8a3c" }}>best combo {r.best}</span><span style={{ color: "#6fd3ff" }}>reached level {r.level}</span>{r.vips > 0 && <span style={{ color: "#ffd65a" }}>{r.vips} VIP{r.vips > 1 ? "s" : ""}</span>}<span style={{ color: C.dim }}>{r.secs}s</span>
          </div>
          {sold.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>{sold.map(([k, n]) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "4px 8px", borderRadius: 8, background: "rgba(255,255,255,0.06)", fontSize: 13 }}><ItemIcon kind={k} size={18} /> {n} {ITEMS[k].name.toLowerCase()}</span>)}</div>}
          <div style={{ fontSize: 12, color: C.dim }}>Sold items came out of storage; the coins are in the farm's purse.</div>
          <button onClick={onExit} style={bigBtn(true)}>Back to the farm</button>
        </div>
      </Shell>
    );
  }

  // ── Playing ─────────────────────────────────────────────────────────────────
  const sel = (slot) => st.players[slot]?.sel;
  const recent = (kind, secs = 1.4) => st.fx.filter(f => f.kind === kind && st.t - f.at < secs);
  const iMissed = st.fx.some(f => f.kind === "nope" && f.by === mySlot && st.t - f.at < 0.4);
  const total = Object.values(st.start).reduce((a, b) => a + b, 0) || 1, left = leftToSell(st);
  const mul = comboMul(st.combo);
  const banner = recent("banner", 1.5).slice(-1)[0];
  const bg = st.level >= 8 ? "linear-gradient(#ffb36b, #ffd9a0 60%, #b9de8e)" : st.level >= 5 ? "linear-gradient(#9fd2f2, #ffe6b8 65%, #a6d886)" : "linear-gradient(#7ec8f0, #bfe6b0 70%, #9ccf7e)";
  return (
    <Shell title="Market Rush" onLeave={leave} bg="#2a1d12"
      right={<span style={{ display: "flex", gap: 12, alignItems: "center", fontWeight: 900 }}>
        <span style={{ display: "inline-flex", gap: 2 }}>{Array.from({ length: MR_HEARTS }, (_, i) => <Heart key={i} on={i < st.hearts} pop={i === st.hearts - 1 && recent("heart").length > 0} />)}</span>
        <span style={{ color: "#ffd65a", fontSize: 18 }}>{st.coins}</span>
      </span>}>
      <style>{CSS}</style>
      {/* how much is left to sell */}
      <div style={{ position: "relative", height: 18, background: "rgba(255,255,255,0.08)" }}>
        <div style={{ height: "100%", width: `${(1 - left / total) * 100}%`, background: "linear-gradient(90deg, #ffd65a, #ff8a3c)", transition: "width 0.2s" }} />
        <span style={{ position: "absolute", inset: 0, textAlign: "center", fontSize: 11, fontWeight: 900, lineHeight: "18px", color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{left} left to sell · level {st.level}</span>
      </div>
      {/* customers */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 8, padding: "56px 8px 6px", background: bg, position: "relative", flexWrap: "wrap", alignContent: "flex-end", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 30, background: "repeating-linear-gradient(90deg, #e04848 0 36px, #fff4e6 36px 72px)", boxShadow: "0 4px 0 rgba(0,0,0,0.12)" }} />
        <div style={{ position: "absolute", top: 30, left: 0, right: 0, height: 12, background: "radial-gradient(circle at 18px 0, #e04848 12px, transparent 13px) 0 0 / 72px 12px repeat-x, radial-gradient(circle at 54px 0, #fff4e6 12px, transparent 13px) 0 0 / 72px 12px repeat-x" }} />
        {st.combo >= 2 && (
          <div key={mul} style={{ position: "absolute", top: 46, right: 12, padding: "4px 12px", borderRadius: 999, fontWeight: 900, fontSize: 18, color: "#fff", background: mul > 1 ? "linear-gradient(#ff8a3c, #e0483c)" : "rgba(0,0,0,0.3)", animation: mul > 1 ? "mrPulse 0.6s ease-in-out infinite" : "none", boxShadow: mul > 1 ? "0 0 14px rgba(255,138,60,0.8)" : "none" }}>
            {st.combo} in a row{mul > 1 ? ` · ×${mul}` : ""}
          </div>
        )}
        {[0, 1, 2, 3, 4, 5].map(spot => {
          const c = st.customers.find(x => x.spot === spot);
          const paid = recent("paid").find(f => f.spot === spot), huff = recent("huff", 0.8).find(f => f.spot === spot);
          if (!c) {
            if (!paid && !huff) return null;
            return (
              <div key={"e" + spot} style={{ position: "relative", width: 140, height: 160, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
                {paid && <>
                  <span style={{ fontSize: 26, color: paid.vip ? "#b07800" : "#a86a00", animation: "mrUp 1.3s ease-out forwards", textShadow: "0 2px 0 #fff" }}>+{paid.n}</span>
                  {Array.from({ length: paid.vip ? 10 : 6 }, (_, i) => <span key={i} style={{ position: "absolute", left: "50%", top: "60%", width: 14, height: 14, borderRadius: 7, background: "#ffd65a", border: "2px solid #e0a82e", ["--dx"]: `${(i - 3) * 22}px`, animation: `mrCoin 0.9s ${i * 0.04}s ease-out forwards` }} />)}
                </>}
                {huff && <span style={{ fontSize: 20, color: "#c03", animation: "mrHuff 0.8s ease-in forwards" }}>hmph!</span>}
              </div>
            );
          }
          const pFrac = Math.max(0, c.patience / c.max);
          const mine = sel(mySlot) === c.id, theirs = sel(1 - mySlot) === c.id;
          const shake = pFrac < 0.25 ? `translateX(${Math.sin(st.t * 30) * 3}px)` : "none";
          return (
            <div key={c.id} style={{ animation: "mrIn 0.45s ease-out" }}>
              <button data-cust={c.id} onClick={() => act({ k: "sel", id: c.id })} style={{
                width: 140, padding: 6, borderRadius: 14, cursor: "pointer", fontFamily: "inherit", touchAction: "manipulation",
                background: c.vip ? "linear-gradient(#fff6d0, #ffe38a)" : "rgba(255,255,255,0.88)", border: `3px solid ${mine ? P_COLORS[mySlot] : theirs ? P_COLORS[1 - mySlot] : c.vip ? "#e0a82e" : "transparent"}`,
                boxShadow: "0 3px 0 rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transform: shake, color: "#2a1d12",
                animation: c.vip ? "mrGlow 1s ease-in-out infinite" : "none",
              }}>
                {c.vip && <span style={{ fontSize: 10, fontWeight: 900, color: "#a86a00", letterSpacing: 1 }}>VIP · PAYS DOUBLE</span>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center", minHeight: 28 }}>
                  {Object.entries(c.order).map(([k, q]) => {
                    const got = c.got[k] || 0, done = got >= q;
                    return <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 1, padding: "1px 4px", borderRadius: 8, background: done ? "#c8f0c0" : "#fff3d6", fontSize: 12, fontWeight: 900, opacity: done ? 0.6 : 1 }}><ItemIcon kind={k} size={22} />{done ? "✓" : `${q - got}`}</span>;
                  })}
                </div>
                <div style={{ transform: pFrac < 0.25 ? "rotate(-4deg)" : "none" }}><Pic c={c} size={70} /></div>
                <div style={{ width: "100%", height: 8, borderRadius: 4, background: "rgba(0,0,0,0.12)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pFrac * 100}%`, background: pFrac < 0.25 ? "#e0483c" : pFrac < 0.5 ? "#f0a030" : "#4cbf5a" }} />
                </div>
              </button>
            </div>
          );
        })}
        {!st.customers.length && <div style={{ position: "absolute", top: "45%", left: 0, right: 0, textAlign: "center", fontWeight: 900, fontSize: 18, color: "rgba(42,29,18,0.5)" }}>{st.t < 2 ? "Here they come…" : "…"}</div>}
        {st.helpers.length > 0 && (
          <div style={{ position: "absolute", left: 8, bottom: 6, display: "flex", gap: 2 }}>
            {st.helpers.map(h => <div key={h.cid} style={{ transform: recent("help", 0.3).some(f => f.cid === h.cid) ? "translateY(-10px)" : "none", transition: "transform 0.15s" }}><Pic c={h} size={40} /></div>)}
          </div>
        )}
        {banner && <div key={banner.id} style={{ position: "absolute", top: "40%", left: "50%", fontSize: 44, fontWeight: 900, color: banner.color, WebkitTextStroke: "2px #2a1d12", textShadow: "0 5px 0 rgba(0,0,0,0.25)", whiteSpace: "nowrap", pointerEvents: "none", animation: "mrBanner 1.5s ease-out forwards" }}>{banner.text}</div>}
      </div>
      {/* counter */}
      <div style={{ background: "repeating-linear-gradient(90deg, #9b6a40 0 40px, #8d5f38 40px 80px)", borderTop: "6px solid #6b4426", padding: 10, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", transform: iMissed ? `translateX(${Math.sin(st.t * 60) * 4}px)` : "none" }}>
        {Object.entries(st.stock).map(([k, n]) => {
          const tapped = st.fx.filter(f => f.kind === "gave" && f.item === k).slice(-1)[0];
          const wanted = st.customers.some(c => (c.order[k] || 0) > (c.got[k] || 0));
          return (
            <button key={k} data-bin={k} disabled={n <= 0} onClick={() => act({ k: "give", item: k })} style={{
              width: 88, height: 88, borderRadius: 14, cursor: n > 0 ? "pointer" : "default", fontFamily: "inherit", touchAction: "manipulation", position: "relative",
              background: n > 0 ? (wanted ? "#fff0cf" : "#e8d4b0") : "rgba(0,0,0,0.25)", border: `3px solid ${wanted && n > 0 ? "#ffb347" : "#6b4426"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: "#2a1d12", opacity: n > 0 ? 1 : 0.4,
            }}>
              <span key={tapped?.id || 0} style={{ display: "flex", animation: tapped ? "mrBin 0.2s ease-out" : "none" }}><ItemIcon kind={k} size={46} /></span>
              <span style={{ fontWeight: 900, fontSize: 14 }}>{n > 0 ? n : "gone!"}</span>
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

function Heart({ on, pop }) {
  return (
    <svg width="22" height="20" viewBox="0 0 24 22" style={{ animation: pop ? "mrPulse 0.4s ease-out 2" : "none" }}>
      <path d="M12 21s-9-5.6-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.4-9 12-9 12z" fill={on ? "#ff5d73" : "rgba(255,255,255,0.15)"} stroke={on ? "#c0304a" : "none"} strokeWidth="1.5" />
    </svg>
  );
}